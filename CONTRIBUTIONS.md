# Contribution Guide

## Found an Issue?

Thank you for reporting any issues you find. We do our best to test and make paeckchen as solid as possible,
but any reported issue is a real help.

> paeckchen issues

Please follow these guidelines when reporting issues:

* Provide a title in the format of `<Error> when <Task>`
* Provide a short summary of what you are trying to do
* Provide the log of the encountered error if applicable
* Provide the exact version of paeckchen
* Be awesome and consider contributing a [pull request](#want-to-contribute)

## Want to contribute?

You consider contributing changes to paeckchen – we dig that!
Please consider these guidelines when filing a pull request:

> paeckchen pull requests

* Follow the [Coding Rules](#coding-rules)
* Follow the [Commit Rules](#commit-rules)
* Make sure you rebased the current master branch when filing the pull request
* Provide a short title with a maximum of 100 characters
* Provide a more detailed description containing
  * What you want to achieve
  * What you changed
  * What you added
  * What you removed

## Coding Rules

To keep the code base of paeckchen neat and tidy the following rules apply to every change

> Coding standards

* Respect tslint
* Use advanced language features where possible
* Coverage never drops below 95%
* No change may lower coverage by more than 1%
* Be awesome

## Commit Rules

To help everyone with understanding the commit history of paeckchen the following commit rules are enforced.
To make your life easier paeckchen is commitizen-friendly (For your convenience install [cz-cli](https://github.com/commitizen/cz-cli)).

> Commit standards

* [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog)
* husky commit message hook available
* present tense
* maximum of 100 characters
* message format of `$type($scope): $message`

