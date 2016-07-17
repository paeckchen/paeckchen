'use strict';

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const commonTags = require('common-tags');
const fsExtra = require('fs-extra');
const NpmRegistryClient = require('npm-registry-client');
const conventionalCommitsParser = require('conventional-commits-parser');
const semver = require('semver');

function promisify(fn) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      fn.apply(null, [].concat(args, function () {
        const args = Array.prototype.slice.call(arguments);
        if (args[0]) {
          return reject(args[0]);
        }
        resolve.apply(null, args.slice(1));
      }));
    });
  };
}

const fsReaddir = promisify(fs.readdir);
const fsReadfile = promisify(fs.readFile);
const fsOutputFile = promisify(fsExtra.outputFile);
const fsCopy = promisify(fsExtra.copy);
const fsMove = promisify(fsExtra.move);
const fsRemove = promisify(fsExtra.remove);
const fsReadJson = promisify(fsExtra.readJson);
const fsWriteJson = promisify(fsExtra.writeJson);

const packagesDirectory = path.join(process.cwd(), 'packages');

function forEach(list, task) {
  return list.reduce((promise, entry) => promise.then(() => task(entry)), Promise.resolve());
}

function getPackages() {
  return fsReaddir(packagesDirectory);
}

function readAllPackageJsonFiles(list) {
  return Promise.all(list.map(file => getPackageJson(file)));
}

function sortDependencys(list, pkgs) {
  list.sort((left, right) => {
    let pkg = pkgs.find(pkg => right === pkg.name);
    if (left in pkg.devDependencies || left in pkg.dependencies) {
      return -1;
    }
    pkg = pkgs.find(pkg => left === pkg.name);
    if (right in pkg.devDependencies || right in pkg.dependencies) {
      return 1;
    }
    return 0;
  });
  return list;
}

function getOrderedPackages() {
  return getPackages()
    .then(packages =>
      readAllPackageJsonFiles(packages)
        .then(pkgs => ({packages, pkgs})))
    .then(context => sortDependencys(context.packages, context.pkgs));
}

function getDependents(packageDir) {
  return getPackages()
    .then(packages => readAllPackageJsonFiles(packages).then(pkgs => ({packages, pkgs})))
    .then(context => context.packages.filter(name => {
      const pkg = context.pkgs.find(pkg => name === pkg.name);
      return packageDir in pkg.devDependencies || packageDir in pkg.dependencies;
    }));
}

function getPackageJson(packageDir) {
  return fsReadJson(path.join(packagesDirectory, packageDir, 'package.json'));
}

function patchPackageJson(pkg) {
  return getPackages()
    .then(packages => {
      packages.forEach(file => delete pkg.devDependencies[file]);
      packages.forEach(file => delete pkg.dependencies[file]);
    })
    .then(() => pkg);
}

function npm(packageDir, command) {
  return Promise.resolve()
    .then(() => {
      const opts = {
        cwd: path.join(packagesDirectory, packageDir),
        env: process.env,
        stdio: 'inherit'
      };
      childProcess.execSync(`npm ${command}`, opts);
    });
}

function getPackageDependencies(pkg) {
  return getPackages()
    .then(packages => {
      return [].concat(
        packages.filter(file => file in pkg.devDependencies),
        packages.filter(file => file in pkg.dependencies)
      );
    });
}

function linkDependencies(packageDir) {
  return getPackages()
    .then(() => {
      return getPackageJson(packageDir)
        .then(pkg => getPackageDependencies(pkg))
        .then(dependencies => {
          return forEach(dependencies,
              dependency => {
                const dependecyModulPath = path.join(packagesDirectory, packageDir, 'node_modules', dependency);
                return fsOutputFile(path.join(dependecyModulPath, 'index.js'),
                    `module.exports = require('../../../${dependency}/')`)
                  .then(() => fsOutputFile(path.join(dependecyModulPath, 'index.d.ts'),
                    `export * from '../../../${dependency}/index.d.ts';`));
              });
        });
    });
}

function withPatchedPackageJson(packageDir, fn) {
  const packageJsonPath = path.join(packagesDirectory, packageDir, 'package.json');
  const packageJsonBackupPath = path.join(packagesDirectory, packageDir, 'package.json.orig');
  return fsCopy(packageJsonPath, packageJsonBackupPath)
    .then(() => {
      return fsReadJson(packageJsonPath)
        .then(pkg => patchPackageJson(pkg))
        .then(pkg => fsWriteJson(packageJsonPath, pkg))
        .then(() => fn())
        .catch(err => {
          return fsMove(packageJsonBackupPath, packageJsonPath, {clobber: true})
            .then(() => {
              throw err;
            });
        });
    })
    .then(() => fsMove(packageJsonBackupPath, packageJsonPath, {clobber: true}));
}

function remoteNpmGet(packageDir) {
  return new Promise((resolve, reject) => {
    const noop = () => undefined;
    const client = new NpmRegistryClient({
      log: {
        error: noop,
        warn: noop,
        info: noop,
        verbose: noop,
        silly: noop,
        http: noop,
        pause: noop,
        resume: noop
      }
    });
    const params = {
      timeout: 1000
    };
    return client
      .get(`https://registry.npmjs.org/${packageDir}`, params, (err, data) => {
        if (err) {
          if (err.statusCode === 404) {
            return resolve(undefined);
          }
          return reject(err);
        }
        resolve(data);
      });
  });
}

function getReleaseData(packageDir, npm) {
  return Promise.resolve()
    .then(() => getPackageJson(packageDir)
        .then(pkg => ({
          npm,
          pkg
        })))
    .then(data => {
      data.tag = (data.pkg.publishConfig || {}).tag || 'latest';
      if (data.npm) {
        data.lastVersion = data.npm['dist-tags'][data.tag];
        if (data.lastVersion) {
          data.lastGitHash = data.npm.versions[data.lastVersion].gitHead;
        }
      }
      return data;
    })
    .then(data => {
      if (!data.lastGitHash) {
        return git(packageDir, 'rev-list --abbrev-commit --max-parents=0 HEAD')
          .then(firstGitHash => {
            data.lastGitHash = firstGitHash;
            return data;
          });
      }
      return data;
    });
}

function getReleaseCommits(packageDir, data) {
  return Promise.resolve()
    .then(() => {
      return git(packageDir, `log -E --format=%B==END== ${data.lastGitHash}..HEAD`)
        .then(stdout => stdout.split('==END==\n'))
        .then(commits => commits.filter(commit => Boolean(commit.trim())))
        .then(commits => {
          const parsedCommits = [];
          const parser = conventionalCommitsParser();
          parser.on('data', parsed => parsedCommits.push(parsed));
          commits.forEach(commit => parser.write(commit));
          parser.end();
          return parsedCommits;
        })
        .then(commits => commits.filter(commit => commit.scope === packageDir))
        .then(commits => {
          data.commits = commits;
          data.requireRelease = data.commits.length > 0;
          return data;
        });
    });
}

function getNextVersion(packageDir, data) {
  const releases = ['patch', 'minor', 'major'];
  const typeToReleaseIndex = {
    fix: 0,
    feat: 1
  };

  return Promise.resolve()
    .then(() => {
      const relaseIndex = data.commits.reduce((relase, commit) => {
        let result = relase > (typeToReleaseIndex[commit.type] || 0) ? relase : typeToReleaseIndex[commit.type];
        if (commit.footer && commit.footer.indexOf('BREAKING CHANGE:\n') > -1) {
          result = 2;
        }
        return result;
      }, 0);
      data.release = releases[relaseIndex];
      if (data.lastVersion) {
        data.nextVersion = semver.inc(data.lastVersion, data.release);
      } else {
        data.nextVersion = data.pkg.version;
      }
      return data;
    });
}

function git(packageDir, command) {
  return Promise.resolve()
    .then(() => {
      const opts = {
        cwd: path.join(packagesDirectory, packageDir),
        env: process.env
      };
      return childProcess.execSync(`git ${command}`, opts);
    })
    .then(buffer => buffer.toString().trim());
}

function runOnPackages(commands, command, args) {
  return getOrderedPackages()
    .then(packages => {
      return forEach(packages, file => {
        return commands[command].apply(null, [].concat([file], args));
      });
    });
}

function runCommandBootstrap(packageDir) {
  return Promise.resolve()
    .then(() => {
      return withPatchedPackageJson(packageDir, () => {
        return npm(packageDir, 'install')
          .then(() => npm(packageDir, 'prune'));
      })
      .then(() => linkDependencies(packageDir));
    });
}

function runCommandReset(packageDir) {
  return fsRemove(path.join(packagesDirectory, packageDir, 'node_modules'));
}

function updatePackageJson(packageDir, fn) {
  const packageJson = path.join(packagesDirectory, packageDir, 'package.json');
  return fsReadfile(packageJson)
    .then(buffer => buffer.toString().split('\n'))
    .then(lines => fn(lines))
    .then(lines => fsOutputFile(packageJson, lines.join('\n')));
}

function incrementPackageVersion(packageDir, data) {
  return updatePackageJson(packageDir, lines => lines.map(line =>
    line.replace(/^(\s*"version"\s*:\s*")(\d+(?:\.\d+(?:\.\d+)?)?)("\s*(?:,\s*)?)$/, `$1${data.nextVersion}$3`)));
}

function updateDependents(packageDir, data) {
  return getDependents(packageDir)
    .then(dependents => forEach(dependents, dependent => updatePackageJson(dependent, lines => lines.map(line =>
      line.replace(new RegExp(`^(\s*"${packageDir}"\s*:\s*")(\d+(?:\.\d+(?:\.\d+)?)?)("\s*(?:,\s*)?)$`), `$1${data.nextVersion}$3`)))));
}

function runCommandRelease(packageDir) {
  return git('..', `status --porcelain`)
    .then(stdout => {
      if (stdout !== '') {
        throw new Error('Git workspace not clean!');
      }
    })
    .then(() => remoteNpmGet(packageDir))
    .then(npm => getReleaseData(packageDir, npm))
    .then(data => getReleaseCommits(packageDir, data))
    .then(data => getNextVersion(packageDir, data))
    .then(data => {
      if (data.requireRelease) {
        return incrementPackageVersion(packageDir, data)
          .then(() => runCommandNpmRun(packageDir, 'release'))
          .then(() => updateDependents(packageDir, data))
          .then(() => git('..', `add .`))
          .then(() => git('..', `commit -m "Release ${packageDir} - ${data.nextVersion}"`))
          .then(() => git('..', `tag ${packageDir}-${data.nextVersion}`));
      }
      console.log(`No release for ${packageDir} required`);
      return data;
    });
}

function runCommandNpmRun(packageDir, task) {
  return Promise.resolve()
    .then(() => getPackageJson(packageDir))
    .then(pkg => task in pkg.scripts)
    .then(hasTask => hasTask ? npm(packageDir, `run ${task}`) : console.log(`No ${task} script for ${packageDir}`));
}

function runCommandNpm(packageDir, args) {
  return Promise.resolve()
    .then(() => withPatchedPackageJson(packageDir, () => {
      return npm(packageDir, args.join(' '));
    }));
}

const commands = {
  bootstrap(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Bootstrapping ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return runCommandBootstrap(packageDir);
  },
  reset(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Reset ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return runCommandReset(packageDir);
  },
  release(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Release ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return runCommandRelease(packageDir);
  },
  run(packageDir, task) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Running npm script '${task}' in ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return runCommandNpmRun(packageDir, task);
  },
  npm(packageDir) {
    const args = Array.prototype.slice.call(arguments).slice(1);

    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Running 'npm ${args.join(' ')}' in ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return runCommandNpm(packageDir, args);
  }
};

if (process.argv.length < 3) {
  console.error('Missing task');
  process.exit(1); // eslint-disable-line xo/no-process-exit
}

const command = process.argv[2];
const commandArguments = process.argv.slice(3);
const start = new Date().getTime();
runOnPackages(commands, command, commandArguments)
  .then(() => {
    const end = new Date().getTime();
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Successful command: ${command} (${((end - start) / 1000)}s)

      -------------------------------------------------------------------------------
    `}\n`);
  })
  .catch(err => {
    const end = new Date().getTime();
    console.error(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Failed command: ${command}  (${((end - start) / 1000)}s)
          ${err.toString()}

      -------------------------------------------------------------------------------
    `}\n`);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1); // eslint-disable-line xo/no-process-exit
  });
