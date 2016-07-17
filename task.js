'use strict';

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const commonTags = require('common-tags');
const fsExtra = require('fs-extra');

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

function requiresRelease(packageDir) {
  return git(packageDir, 'tag --sort="-version:refname"')
    .then(tags => tags ? tags : git(packageDir, 'rev-list --abbrev-commit --max-parents=0 HEAD'))
    .then(tag => {
      console.log('last tag', tag);
      return git(packageDir, `show --name-only --pretty='format:' ${tag}..HEAD`);
    })
    .then(stdout => stdout.split('\n'))
    .then(lines => lines.filter(line => line.match(new RegExp(`^packages/${packageDir}/`))))
    .then(files => files.length > 0);
}

const commands = {
  bootstrap(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Bootstrapping ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return Promise.resolve()
      .then(() => {
        return withPatchedPackageJson(packageDir, () => {
          return npm(packageDir, 'install')
            .then(() => npm(packageDir, 'prune'));
        })
        .then(() => linkDependencies(packageDir));
      });
  },
  reset(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Reset ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return fsRemove(path.join(packagesDirectory, packageDir, 'node_modules'));
  },
  release(packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Release ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return requiresRelease(packageDir)
      .then(requireRelease => console.log(requireRelease));
  },
  run(packageDir, task) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Running npm script '${task}' in ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return Promise.resolve()
      .then(() => getPackageJson(packageDir))
      .then(pkg => task in pkg.scripts)
      .then(hasTask => hasTask ? npm(packageDir, `run ${task}`) : console.log(`Skip ${task} for ${packageDir}`));
  },
  npm(packageDir) {
    const args = Array.prototype.slice.call(arguments).slice(1);

    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Running 'npm ${args.join(' ')}' in ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`);
    return Promise.resolve()
      .then(() => withPatchedPackageJson(packageDir, () => {
        return npm(packageDir, args.join(' '));
      }));
  }
};

if (process.argv.length < 3) {
  console.error('Missing task');
  process.exit(1); // eslint-disable-line xo/no-process-exit
}
const command = process.argv[2];
const commandArguments = process.argv.slice(3);

const start = new Date().getTime();
getOrderedPackages()
  .then(packages => {
    return forEach(packages, file => {
      return commands[command].apply(null, [].concat([file], commandArguments));
    });
  })
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
