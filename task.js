'use strict'

const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')

function getPackages () {
  return new Promise((resolve, reject) => {
    fs.readdir(path.join(process.cwd(), 'packages'), (err, files) => {
      if (err) {
        return reject(err)
      }
      resolve(files)
    })
  })
}

const commands = {
  install (packageDir) {
    const opts = {
      cwd: path.join(process.cwd(), 'packages', packageDir),
      env: process.env,
      stdio: 'inherit'
    }
    childProcess.execSync('npm install', opts)
  },
  run (packageDir, task) {
    const opts = {
      cwd: path.join(process.cwd(), 'packages', packageDir),
      env: process.env,
      stdio: 'inherit'
    }
    childProcess.execSync(`npm run ${task}`, opts)
  }
}

if (process.argv.length < 3) {
  console.error('Missing task')
  process.exit(1)
}

getPackages()
  .then(files => files.map(file => commands[process.argv[2]].apply(null, [].concat([file], process.argv.slice(3)))))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
