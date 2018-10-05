# Steps for Publishing to npm

* update version in package.json
* npm run package
* update changelog.md
* git commit -m "(release): 4.0.1"
* git tag 4.0.1
* git push --tags
* npm publish
