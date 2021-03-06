# paeckchen

[![license][license-image]][license-url]
[![commitizen][commitizen-image]][commitizen-url]

## Rationale

**TL;DR** paeckchen (german for small parcel) is an incremental, fast and efficient JavaScript module bundler
[doing one thing well](https://en.wikipedia.org/wiki/Unix_philosophy#Do_One_Thing_and_Do_It_Well).

Most JavaScript module bundlers do a lot of things – being plugin pipelines, fulfilling development setup wishes, being
development servers and so on. This breadth of features inevitably comes with tradeoffs.

paeckchen on the other hand is designed to do exactly one thing: It bundles your JavaScript modules. This focus allows
paeckchen to do its job fast and efficiently.

## packages

paeckchen is developed in multiple repositories; This repository is the main entry point and documentation for paeckchen.

 Package          | Version                                                | Dependencies
------------------|:-------------------------------------------------------|:-----------------------------------------------
 [paeckchen-core] | [![npm][npm-version-core-image]][npm-version-core-url] | [![dep][daviddm-core-image]][daviddm-core-url]
 [paeckchen-cli]  | [![npm][npm-version-cli-image]][npm-version-cli-url]   | [![dep][daviddm-cli-image]][daviddm-cli-url]
 [gulp-paeckchen] | [![npm][npm-version-gulp-image]][npm-version-gulp-url] | [![dep][daviddm-gulp-image]][daviddm-gulp-url]

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
* [x] Watch mode
* [x] SourceMaps
* [x] Development Cache

See [Roadmap](https://github.com/paeckchen/paeckchen/milestones) for upcoming stuff.

---

## Development

If you want to compile the source yourself, here are the instructions.  
_Remember that paeckchen lives in a monorepository, that means a simple `npm install` does not work and will break the
setup._

```shell
git clone https://github.com/paeckchen/paeckchen.git
cd paeckchen
npm run bootstrap
npm test
```

Development of a specific package of paeckchen will be more easy with running two watch tasks for that package.

```shell
cd packages/paeckchen-core
# in terminal one
npm run build:watch
# in terminal two
npm run test:watch
```

## Contributions

See [contribution guide](CONTRIBUTIONS.md)

---
paeckchen is built by [KnisterPeter](https://github.com/KnisterPeter) and
[contributors](https://github.com/paeckchen/paeckchen/graphs/contributors) and released under the
[MIT](./LICENSE) license.

[paeckchen-core]: https://github.com/paeckchen/paeckchen-core
[paeckchen-cli]: https://github.com/paeckchen/paeckchen-cli
[gulp-paeckchen]: https://github.com/paeckchen/gulp-paeckchen

[license-image]: https://img.shields.io/github/license/paeckchen/paeckchen.svg
[license-url]: https://github.com/paeckchen/paeckchen

[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/

[npm-version-core-image]: https://img.shields.io/npm/v/paeckchen-core.svg
[npm-version-core-url]: https://www.npmjs.com/package/paeckchen-core
[npm-version-cli-image]: https://img.shields.io/npm/v/paeckchen-cli.svg
[npm-version-cli-url]: https://www.npmjs.com/package/paeckchen-cli
[npm-version-gulp-image]: https://img.shields.io/npm/v/gulp-paeckchen.svg
[npm-version-gulp-url]: https://www.npmjs.com/package/gulp-paeckchen

[daviddm-core-image]: https://img.shields.io/david/paeckchen/paeckchen-core.svg
[daviddm-core-url]: https://david-dm.org/paeckchen/paeckchen-core
[daviddm-cli-image]: https://img.shields.io/david/paeckchen/paeckchen-cli.svg
[daviddm-cli-url]: https://david-dm.org/paeckchen/paeckchen-cli
[daviddm-gulp-image]: https://img.shields.io/david/paeckchen/gulp-paeckchen.svg
[daviddm-gulp-url]: https://david-dm.org/paeckchen/gulp-paeckchen
