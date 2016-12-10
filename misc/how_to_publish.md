# How to publish vis.js

This document describes how to publish vis.js.


## Build

- Change the version number of the library in `package.json`.

        npm version major|minor|patch
        git commit -m "bumped package.json version to X.XX.X"

- Open `HISTORY.md`, write down the changes, version number, and release date.
  (Changes since last release: `git log \`git describe --tags --abbrev=0\`..HEAD --oneline`)

- Update external dependencies

        npm install -g npm-check-updates
        npm-check-updates -u
        git commit -a -m "updated external dependencies"

- Build the library by running:

        npm prune
        npm update
        npm run build

## Test

- Test the library:

        npm test

- Open some of the examples in your browser and visually check if it works as expected.


## Commit

- Commit the changes to the `develop` branch.
- Merge the `develop` branch into the `master` branch.
- Push the branches to github
- Create a version tag (with the new version number) and push it to github:

        git tag v3.1.0
        git push --tags


## Publish

- Publish at npm:

        npm publish

- Test the published library:
  - Go to a temp directory
  - Install the library from npm:

          npm install vis

    Verify if it installs the just released version, and verify if it works.

  - Install the library via bower:

          bower install vis

    Verify if it installs the just released version, and verify if it works.

  - Verify within a day or so whether vis.js is updated on http://cdnjs.com/


## Update website

- Copy the `dist` folder from the `master` branch to the `github-pages` branch.
- Copy the `docs` folder from the `master` branch to the `github-pages` branch.
- Copy the `examples` folder from the `master` branch to the `github-pages` branch.
- Create a packaged version of vis.js. Go to the `master` branch and run:

        zip vis.zip dist docs examples README.md HISTORY.md CONTRIBUTING.md LICENSE* NOTICE -r

- Move the created zip file `vis.zip` to the `download` folder in the
  `github-pages` branch. TODO: this should be automated.

- Check if there are new or updated examples, and update the gallery screenshots
  accordingly.

- Update the library version number in the index.html page.

- Update the CDN links at the download section of index.html AND the CDN link at the top. (replace all)

- Commit the changes in the `gh-pages` branch.


## Prepare next version

- Switch to the `develop` branch.
- Change version numbers in `package.json` to a snapshot
  version like `0.4.0-SNAPSHOT`.
