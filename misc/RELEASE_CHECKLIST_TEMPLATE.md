# Release Checklist

## Communication
- [x] Create a new issue and copy&past this checklist into it (Yeah! First Step done!)
- [x] Talk to the team: Who should make the release?
- [x] Announce a "Code-Freeze". No new Pull-Request until the release is done!
- [x] Checkout if we have MAJOR or MINOR changes. If not we do a PATCH release.
- [x] The new version will be: `vX.X.Y`
- [x] Identify open BUGS and add them to the next PATCH milestone (optional).
- [x] Identify MINOR issues and add them to the next MINOR milestone (optional).

## Update to the newest version
- [x] Update to the current version: `git checkout develop && git pull`.
- [x] Create a new release branch. (`git checkout -b vX.X.Y develop`)

## Build & Test
- [x] Update the version number of the library in `package.json` (remove the "SNAPSHOT").
- [x] Build the library: `npm prune && rm -rf node_modules && npm install && npm run build && npm run test`
- [ ] Open some of the examples in your browser and visually check if it works as expected! (*We need automated tests for this!*)

## History
(*THIS IS A LOT OF WORK! WE SHOULD TRY TO automate this in the future!!*)

- [x] Get all commits since the last release: ```git log `git describe --tags --abbrev=0`..HEAD --oneline > .commits.tmp```
- [x] Open ".commity.tmp". and remove all commit before the last release.
- [x] Open every commit in GitHub and move every issue/pull-request to the current milestone.
- [x] Transfer all Commit-Messages/issues to "HISTORY.md" starting at the button.
 - Keep the order of the commits. Older commits are lower newers are higher.
 - Bug-Fixes start with `FIX #issue:`
 - New Features start with `FEAT #issue:`

## Commit
- [x] Commit the new version: `git commit -am "Release vX.X.Y"`
- [x] Push the release branch: `git push`
- [x] Open a Pull-Request for the release-branch to the develop-branch.
- [x] Wait until somebody of the team looked over your changes and merges the Pull-Request.

### Update Master
We don't merge the development branch to the master because the master branch is different to the develop-Branch. The master branch has a dist and test folder and does not generate Source-Maps.

If we would merge the development branch would overwrite this. To solve this we use rebase instead:

- [x] Update: `git fetch && git checkout develop && git pull`
- [x] Rebase the `master` branch on the `develop` branch: `git checkout master && git rebase develop`
- [x] Generate new dist files: `npm prune && rm -rf node_modules && npm install && npm run build && npm run test && git commit -am "generated dist files for vX.X.Y"
- [x] Create a version tag: `git tag "vX.X.Y"`
- [x] [Remove the protection](https://github.com/almende/vis/settings/branches/master) from `master`.
- [x] FORCE-Push the branches to github: `git push --force && git push --tag`
- [x] [Re-Enable branch protection](https://github.com/almende/vis/settings/branches/master) (enable ALL checkboxes) for `master`.
- [x] Publish with npm: `npm publish` (check [npmjs.com](https://www.npmjs.com/package/vis))

## Test
- [x] Go to a temp directory (e.g. "vis_vX.X.Y"): `cd .. && mkdir vis_vX.X.Y && cd vis_vX.X.Y`
- [x] Install the library from npm: `npm init -f && npm install vis`
- [x] Verify if it installs the just released version, and verify if it works: `cd node_modules/vis/
- [x] Install the library via bower: `cd ../.. && bower install vis`
- [x] Verify if it installs the just released version, and verify if it works: `cd bower_components/vis/`
- [x] Clone the master from github: `cd ../.. && git clone git@github.com:almende/vis.git`.
- [x] Verify if it installs the just released version, and verify if it works. `cd vis`

## Update website
- [x] update the gh-pages branch: `git checkout gh-pages && git pull && git checkout -b "gh-pages_vX.X.Y"`
- [x] Copy the `dist` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.X.Y/vis/dist .`
- [x] Copy the `docs` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.X.Y/vis/docs .`
- [x] Copy the `examples` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.X.Y/vis/examples .`
- [x] Check if there are new or updated examples, and update the gallery screenshots accordingly.
- [x] Update the library version number in the `index.html` page.
- [x] Update the CDN links at the download section of index.html AND the CDN link at the top. (search-replace all!!)
- [x] Commit the changes: `git add -A && git commit -m "updates for vX.X.Y"`
- [x] Push the changes `git push --set-upstream origin gh-pages_vX.X.Y`

## Prepare next version
- [x] Switch to the "develop" branch: `git checkout develop`.
- [x] Change version numbers in "package.json" to a snapshot version `X.X.Z-SNAPSHOT`.
- [x] Commit and push: `git commit -am "changed version to vX.X.Z-SNAPSHOT"`
- [x] Create new tag: `git tag vX.X.Z-SNAPSHOT`.
- [x] [Remove the protection](https://github.com/almende/vis/settings/branches/develop) from `develop`.
- [x] FORCE-Push the branches to github: `git push --force && git push --tag`
- [x] [Re-Enable branch protection](https://github.com/almende/vis/settings/branches/develop) (enable ALL checkboxes) for `develop`.

DONE!
