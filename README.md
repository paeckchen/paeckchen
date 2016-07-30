# paeckchen

[![GitHub license](https://img.shields.io/github/license/paeckchen/paeckchen.svg)]()
[![Dependency Status](https://david-dm.org/paeckchen/paeckchen.svg)](https://david-dm.org/paeckchen/paeckchen)
[![devDependency Status](https://david-dm.org/paeckchen/paeckchen/dev-status.svg)](https://david-dm.org/paeckchen/paeckchen#info=devDependencies)
[![Travis](https://img.shields.io/travis/paeckchen/paeckchen.svg)](https://travis-ci.org/paeckchen/paeckchen)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/orjc50h3g8sh7x08/branch/master?svg=true)](https://ci.appveyor.com/project/KnisterPeter/paeckchen/branch/master)
[![Coveralls branch](https://img.shields.io/coveralls/paeckchen/paeckchen/master.svg)](https://coveralls.io/github/paeckchen/paeckchen)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

## Rationale

**TL;DR** paeckchen (german for small parcel) is an incremental, fast and efficient JavaScript module bundler
[doing one thing well](https://en.wikipedia.org/wiki/Unix_philosophy#Do_One_Thing_and_Do_It_Well).

Most JavaScript module bundlers do a lot of things – being plugin pipelines, fulfilling development setup wishes, being
development servers and so on. This breadth of features inevitably comes with tradeoffs.

paeckchen on the other hand is designed to do exactly one thing: It bundles your JavaScript modules. This focus allows
paeckchen to do its job fast and efficiently.

## packages

paeckchen is developed as a monorepository, this means all packages belonging to paeckchen live in this repository.

| Package | Version |
|---------|---------|
| paeckchen-core | [![npm](https://img.shields.io/npm/v/paeckchen-core.svg)](https://www.npmjs.com/package/paeckchen-core) |
| paeckchen-cli | [![npm](https://img.shields.io/npm/v/paeckchen-cli.svg)](https://www.npmjs.com/package/paeckchen-cli) |
| gulp-paeckchen | [![npm](https://img.shields.io/npm/v/gulp-paeckchen.svg)](https://www.npmjs.com/package/gulp-paeckchen) |

## Installation

Grab paeckchen via [npm](https://www.npmjs.com/package/paeckchen):

```shell
npm install paeckchen-cli
```

## Usage

```shell
./node_modules/.bin/paeckchen --entry <path/to/your/entrypoint>
```

## API documentation

```javascript
stay tuned
```

## Features

* [x] ES2015 module support
* [x] CommonJS module support
* [x] Basic support for `jsnext:main` field | [Reference](https://github.com/rollup/rollup/wiki/jsnext:main)
* [x] Basic support for `browser` field | [Reference](https://github.com/defunctzombie/package-browser-field-spec)
* [x] Incremental bundling
* [X] Support for [file based configuration](https://github.com/paeckchen/paeckchen/issues/29)
* [X] Separate [Command line interface](https://github.com/paeckchen/paeckchen/issues/41) module
* [X] [Watch mode](https://github.com/paeckchen/paeckchen/issues/27)
* [X] SourceMaps

---

See [Roadmap](https://github.com/paeckchen/paeckchen/milestones) for upcoming stuff.

---
paeckchen is built by [KnisterPeter](https://github.com/KnisterPeter) and
[contributors](https://github.com/paeckchen/paeckchen/graphs/contributors) and released under the
[MIT](./LICENSE) license.
