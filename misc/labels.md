# How we use Github labels

*Because only team members can add and change labels this document is mainly for maintainers, but also for users to understand how we use labels.*

*It is important to also label old and closed issues uniformly in order to export them later e.g. if the project gets separated into multiple components.*


## Issue Types
If an issue was created it MUST always be labeled as one of the following issue types:

### `Question`
The author has a general or very specific question.<br>
If it is a general question on how to use vis.js the issues should be closed immediately with a reference to [stackoverflow](https://stackoverflow.com/questions/tagged/vis.js).<br>
Specific question or hard problems should stay open.<br>
Questions should be closed within 3 months.

### `Problem`
This issues points to a potential bug that needs to be confirmed.<br>
If the problem most likely originates from the user's code it should be labeled as [`Question`](#question) instead.<br>
The support team should try to reproduce this issue and then close it or mark it as [`Confirmed Bug`](#confirmed-bug).

### `Confirmed Bug`
This issue was reported as [`Problem`](#problem), but the issue is reproducible and is now a confirmed bug.

### `Feature-Request`
This issue proposes a new feature or a change of existing functionality. Issues that are unlikely to get implemented should be closed.

### `wontfix`
This issues is e.g. for discussing a topic or for project management purposes, and is not handled in the usual issue process.


## Graph type
All issues MUST have one of the following type labels. These labels are usually mutually exclusive:

### `DataSet`
Concerns the DataSet implementation.

### `Graph2D`
Concerns the 2D-Graph implementation.

### `Graph3D`
Concerns the 3D-Graph implementation.

### `Network`
Concerns the Network-Graph implementation.

### `source/non-public API`
This issues is just for discussion or is concerning the build-process, the code-style or something similar.

### `Timeline`
Concerns the Timeline-Graph implementation.


## Additional labels

### `Docs`
This issue concerns only the documentation.<br>
If an existing issue is documented wrongly this is a [`Problem`](#problem) in the component and not a [`docs`](#docs) issue.<br>
This can be used for typos or requests for an improvement of the docs.

### `Duplicate`
This issues is a duplicate of an existing issue. The duplicate should be closed. In addition, add a reference to the original issue with a comment.

### `Fixed awaiting release`
This Issue is fixed or implemented in the "develop" branch but is not released yet and therefore should be still open.<br>
This issues should be closed after the changes are merged into the "master" branch.

### `For everyone!`
This is a good issue to start working on if you are new to vis.js and want to help.<br>
This label is also used for labels that may concern a lot of vis.js users.

### `IE / Edge`
These issues concern a problem with the Microsoft Internet Explorer or Edge browser.<br>

### `invalid`
This is not a valid issue.<br>
Someone just created an empty issue, picked the wrong project or something similar.<br>
This can also be used for pull-request to a non-develop branch or something similar.<br>
This issue or pull request should be closed immediately.

### `Issue Inactive`
Issues marked as [`Question`](#question) or [`Problem`](#problem) get marked as inactive when the author is not responsive or the topic is old.<br>
If an issue is marked as inactive for about 2 weeks it can be closed without any hesitation.

### `PRIORITY`
In general this is used for major bugs. There should only exist a few issues marked as PRIORITY at the same time.<br>
These issues need to be handled before all others.

### `Requires breaking change`
A lot of code needs to be changed to implement this. This is maybe something for a major release or something for someone with a lot of time on their hands :-)

### `waiting for answer/improvement`
This is mostly used for pull requests were a reviewer requested some changes and the owner has not responded yet.

### `Work In Progress`
Someone is working on this issue or a pull request already exists and needs to be reviewed.<br>

## Example Workflows

### Bug

[`Problem`](#Problem) ⟶ [`Confirmed Bug`](#confirmed-bug) ⟶ [`Work In Progress`](#work-in-progress) ⟶ [`Fixed awaiting release`](#fixed-awaiting-release)

### Feature-Request

[`Feature-Request`](#feature-request) ⟶ [`Work In Progress`](#work-in-progress) ⟶ [`Fixed awaiting release`](#fixed-awaiting-release)
