# Release Checklist

## Communication
- [ ] Create a new issue and copy&paste this checklist into it (Yeah! First Step done!)
- [ ] Talk to the team: Who should make the release?
- [ ] Announce a "Code-Freeze". No new Pull-Request until the release is done!
- [ ] Checkout if we have MAJOR or MINOR changes. If not we do a PATCH release.
- [ ] The new version will be: `vX.Y.Z`
- [ ] Identify open BUGS and add them to the next PATCH milestone (optional).
- [ ] Identify MINOR issues and add them to the next MINOR milestone (optional).

## Update to the newest version
- [ ] Update to the current version: `git checkout develop && git pull`.
- [ ] Create a new release branch. (`git checkout -b vX.Y.Z develop`)

## Build & Test
- [ ] Update the version number of the library in `package.json` (remove the "SNAPSHOT").
- [ ] Build the library: `npm prune && rm -rf node_modules && npm install && npm run build && npm run test`
- [ ] Open some of the examples in your browser and visually check if it works as expected! (*We need automated tests for this!*)

## History
(*THIS IS A LOT OF WORK! WE SHOULD TRY TO automate this in the future!!*)

- [ ] Get all commits since the last release: ```git log `git describe --tags --abbrev=0`..HEAD --oneline > .commits.tmp```
- [ ] Open ".commity.tmp". and remove all commit before the last release.
- [ ] Open every commit in GitHub and move every issue/pull-request to the current milestone.
- [ ] Transfer all Commit-Messages/issues to "HISTORY.md" starting at the button.
 - Keep the order of the commits. Older commits are lower newers are higher.
 - Bug-Fixes start with `FIX #issue:`
 - New Features start with `FEAT #issue:`
 - Refactors start with `REFA #PR:`
 - Additional work start with `Added #PR:`


## Commit
- [ ] Commit the new version: `git commit -am "Release vX.Y.Z"`
- [ ] Push the release branch: `git push`
- [ ] Open a Pull-Request for the release-branch to the develop-branch.
- [ ] Wait until somebody of the team looked over your changes and merges the Pull-Request.

### Update Master
We don't merge the development branch to the master because the master branch is different to the develop-Branch. The master branch has a dist and test folder and does not generate Source-Maps.

If we would merge the development branch would overwrite this. To solve this we use rebase instead:

- [ ] Update: `git fetch && git checkout develop && git pull`
- [ ] Rebase the `master` branch on the `develop` branch: `git checkout master && git rebase develop`
- [ ] Generate new dist files: `npm prune && rm -rf node_modules && npm install && npm run build && npm run test && git commit -am "generated dist files for vX.Y.Z"
- [ ] Create a version tag: `git tag "vX.Y.Z"`
- [ ] [Remove the protection](https://github.com/almende/vis/settings/branches/master) from `master`.
- [ ] FORCE-Push the branches to github: `git push --force && git push --tag`
- [ ] [Re-Enable branch protection](https://github.com/almende/vis/settings/branches/master) (enable ALL checkboxes) for `master`.
- [ ] Publish with npm: `npm publish` (check [npmjs.com](https://www.npmjs.com/package/vis))
- [ ] Create a [new Release](https://github.com/almende/vis/releases/new) with the tang and the name "vX.Y.Z" and copy the data vom [HISTORY.md](../HISTORY.md) into the body.


## Test
- [ ] Go to a temp directory (e.g. "vis_vX.Y.Z"): `cd .. && mkdir vis_vX.Y.Z && cd vis_vX.Y.Z`
- [ ] Install the library from npm: `npm init -f && npm install vis`
- [ ] Verify if it installs the just released version, and verify if it works: `cd node_modules/vis/
- [ ] Install the library via bower: `cd ../.. && bower install vis`
- [ ] Verify if it installs the just released version, and verify if it works: `cd bower_components/vis/`
- [ ] Clone the master from github: `cd ../.. && git clone git@github.com:almende/vis.git`.
- [ ] Verify if it installs the just released version, and verify if it works. `cd vis`

## Update website
- [ ] update the gh-pages branch: `git checkout gh-pages && git pull && git checkout -b "gh-pages_vX.Y.Z"`
- [ ] Copy the `dist` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.Y.Z/vis/dist .`
- [ ] Copy the `docs` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.Y.Z/vis/docs .`
- [ ] Copy the `examples` folder from the `master` branch to the `github-pages` branch in another directory, overwriting existing files: `cp -rf ../vis_vX.Y.Z/vis/examples .`
- [ ] Check if there are new or updated examples, and update the gallery screenshots accordingly.
- [ ] Update the library version number in the `index.html` page.
- [ ] Update the CDN links at the download section of index.html AND the CDN link at the top. (search-replace all!!)
- [ ] Commit the changes: `git add -A && git commit -m "updates for vX.Y.Z"`
- [ ] Push the changes `git push --set-upstream origin gh-pages_vX.Y.Z`

## Prepare next version
- [ ] Switch to the "develop" branch: `git checkout develop`.
- [ ] Change version numbers in "package.json" to a snapshot version `X.X.Z-SNAPSHOT`.
- [ ] Commit and push: `git commit -am "changed version to vX.X.Z-SNAPSHOT"`
- [ ] Create new tag: `git tag vX.X.Z-SNAPSHOT`.
- [ ] [Remove the protection](https://github.com/almende/vis/settings/branches/develop) from `develop`.
- [ ] FORCE-Push the branches to github: `git push --force && git push --tag`
- [ ] [Re-Enable branch protection](https://github.com/almende/vis/settings/branches/develop) (enable ALL checkboxes) for `develop`.

DONE!