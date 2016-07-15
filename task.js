'use strict'

const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const commonTags = require('common-tags')
const fsExtra = require('fs-extra')
const globby = require('globby')

function promisify (fn) {
  return function () {
    const args = Array.prototype.slice.call(arguments)
    return new Promise((resolve, reject) => {
      fn.apply(null, [].concat(args, function () {
        const args = Array.prototype.slice.call(arguments)
        if (args[0]) {
          return reject(args[0])
        }
        resolve.apply(null, args.slice(1))
      }))
    })
  }
}

const fsReaddir = promisify(fs.readdir)
const fsOutputFile = promisify(fsExtra.outputFile)
const fsCopy = promisify(fsExtra.copy)
const fsMove = promisify(fsExtra.move)
const fsRemove = promisify(fsExtra.remove)
const fsReadJson = promisify(fsExtra.readJson)
const fsWriteJson = promisify(fsExtra.writeJson)

const packagesDirectory = path.join(process.cwd(), 'packages')

function forEach (list, task) {
  return list.reduce((promise, entry) => promise.then(() => task(entry)), Promise.resolve())
}

function getPackages () {
  return fsReaddir(packagesDirectory)
}

function getOrderedPackages () {
  return getPackages()
    .then(packages => {
      return Promise.all(packages.map(file => getPackageJson(file)))
        .then(pkgs => ({packages, pkgs}))
    })
    .then(context => {
      context.packages.sort((left, right) => {
        let pkg = context.pkgs.find(pkg => right === pkg['name'])
        if (left in pkg['devDependencies'] || left in pkg['dependencies']) {
          return -1
        }
        pkg = context.pkgs.find(pkg => left === pkg['name'])
        if (right in pkg['devDependencies'] || right in pkg['dependencies']) {
          return 1
        }
        return 0
      })
      return context.packages
    })
}

function getPackageJson (packageDir) {
  return fsReadJson(path.join(packagesDirectory, packageDir, 'package.json'))
}

function patchPackageJson (pkg) {
  return getPackages()
    .then(packages => {
      packages.forEach(file => delete pkg['devDependencies'][file])
      packages.forEach(file => delete pkg['dependencies'][file])
    })
    .then(() => pkg)
}

function npmInstall (packageDir) {
  return Promise.resolve()
    .then(() => {
      const opts = {
        cwd: path.join(packagesDirectory, packageDir),
        env: process.env,
        stdio: 'inherit'
      }
      childProcess.execSync('npm install', opts)
    })
}

function npmRun (packageDir, task) {
  return Promise.resolve()
    .then(() => {
      const opts = {
        cwd: path.join(packagesDirectory, packageDir),
        env: process.env,
        stdio: 'inherit'
      }
      childProcess.execSync(`npm run ${task}`, opts)
    })
}

function getPackageDependencies (pkg) {
  return getPackages()
    .then(packages => {
      return [].concat(
        packages.filter(file => file in pkg['devDependencies']),
        packages.filter(file => file in pkg['dependencies'])
      )
    })
}

function linkDependencies (packageDir) {
  return getPackages()
    .then(packages => {
      return getPackageJson(packageDir)
        .then(pkg => getPackageDependencies(pkg))
        .then(dependencies => {
          return forEach(dependencies,
              dependency => {
                const dependecyModulPath = path.join(packagesDirectory, packageDir, 'node_modules', dependency)
                return fsOutputFile(path.join(dependecyModulPath, 'index.js'),
                    `module.exports = require('../../../${dependency}/')`)
                  .then(() => fsOutputFile(path.join(dependecyModulPath, 'index.d.ts'),
                    `export * from '../../../${dependency}/index.d.ts';`))
              })
        })
    })
}

const commands = {
  bootstrap (packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Bootstrapping ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`)
    return Promise.resolve()
      .then(() => {
        const packageJsonPath = path.join(packagesDirectory, packageDir, 'package.json')
        const packageJsonBackupPath = path.join(packagesDirectory, packageDir, 'package.json.orig')
        return fsCopy(packageJsonPath, packageJsonBackupPath)
          .then(() => {
            return fsReadJson(packageJsonPath)
              .then(pkg => patchPackageJson(pkg))
              .then(pkg => fsWriteJson(packageJsonPath, pkg))
              .then(() => npmInstall(packageDir))
              .catch(err => {
                return fsMove(packageJsonBackupPath, packageJsonPath, {clobber: true})
                  .then(() => {
                    throw err
                  })
              })
          })
          .then(() => fsMove(packageJsonBackupPath, packageJsonPath, {clobber: true}))
          .then(() => linkDependencies(packageDir))
      })
  },
  reset (packageDir) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Reset ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`)
    return fsRemove(path.join(packagesDirectory, packageDir, 'node_modules'))
  },
  run (packageDir, task) {
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Running ${task} in ${packageDir}

      -------------------------------------------------------------------------------
    `}\n`)
    return Promise.resolve()
      .then(() => getPackageJson(packageDir))
      .then(pkg => task in pkg['scripts'])
      .then(hasTask => hasTask && npmRun(packageDir, task))
  }
}

if (process.argv.length < 3) {
  console.error('Missing task')
  process.exit(1)
}
const command = process.argv[2]
const commandArguments = process.argv.slice(3)

const start = new Date().getTime()
getOrderedPackages()
  .then(packages => {
    return forEach(packages, file => commands[command].apply(null, [].concat([file], commandArguments)))
  })
  .then(() => {
    const end = new Date().getTime()
    console.log(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Successful command: ${command} (${((end - start) / 1000)}s)

      -------------------------------------------------------------------------------
    `}\n`)
  })
  .catch(err => {
    const end = new Date().getTime()
    console.error(`\n${commonTags.stripIndent`
      -------------------------------------------------------------------------------

        Failed command: ${command}  (${((end - start) / 1000)}s)
          ${err.toString()}

      -------------------------------------------------------------------------------
    `}\n`)
    if (err.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  })
