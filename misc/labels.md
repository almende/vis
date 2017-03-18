# How we use github labels

*Because only team-mermbers can add and change labels this document is mainly for maintainers, but also for users to understand how we use labels.*

*It is important to also label old and closed issues uniformly to be able to export them later r.g. if the project gets separated into multiple components.*


## Issue Types
If an issue was created it always MUST be labeled as one of the following issue types:

### `Question`
The author has a general or very specific question.<br>
If it is a general question how to use vis.js the issues should be closed immediately with a reference to [stackoverflow](https://stackoverflow.com/questions/tagged/vis.js).<br>
Specific question or hard problems should stay open.<br>
Questions should be closes within 3 month.

### `Problem`
This issues points to a potential bug that needs to be confirmed.<br>
If the problem is probably in the users code it should be better labeled as `Question`.<br>
The support-Team should try to reproduce this issue and than close it or mark it as `Confirmed Bug`:<br>
`Problem` -> `Confirmed Bug` --> `Work In Progress` --> `Fixed awaiting release`

### `Feature-Request`
This issue proposes a new feature or a change of existing functionality. Issues that are very very unlikely to get implemented should be closed.<br>
This label is often used together with `Requires breaking change`: <br>
`Feature-Request` --> `Work In Progress` --> `Fixed awaiting release`

### `wontfix`
This issues is e.g. only for discussing a topic and is not handled in the usual issue process.


## Graph type
All issues MUST have one of the following type-labels. This labels usually are usually mutually exclusive:

### `Network`
Concerns the Timeline-Graph implementation.

### `Timeline`
Concerns the Timeline-Graph implementation.

### `Graph2D`
Concerns the 2D-Graph implementation.

### `Graph3D`
Concerns the 3D-Graph implementation.

### `DataSet`
Concerns the DataSet implementation.

### `Docs`
This issue concerns only the documentation.<br>
If an existing issue is documented wrongly this is a `Problem` in the component and not a `docs` issue.<br>
This can be used for typos or requests for a improvement of the docs.

### `source/non-public API`
This issues is just for discussion or is concerning the build-process, the code-style or something similar.


## Additional labels

### `Duplicate`
This issues is a duplicate of an existing issue. It should be closed naming the original issue it is a duplicate of.

### `Confirmed Bug`
This issue was reported as `Problem` but the issue was reproducible and is now a confirmed bug.

### `Work In Progress`
Someone is working on this issue or an PR already exists and needs to be reviewed.<br>

### `Fixed awaiting release`
This Issues was fixed or implemented in the "develop" branch to mark issues that have been fixed in development but are not released yet and therefore should be still open.<br>
This issues should be closed if after the

### `For everyone!`
This is a good issue to start working on if you are new to vis.js and want to help.<br>
This label is also used for labels that may concern a lot of vis.js users.

### `IE / Edge`
This is issues concerns a problem in Microsoft Internet Explorer or the Edge browser.<br>

### `Issue Inactive`
Issues marked as `question` or `problem` get marked as inactive if the author is not responsive or the topic is old.<br>
If an issues is marked as inactive for about 2 weeks it can be closed without any hesitation.

### `PRIORITY`
Normally this is used for major Bugs. There should only exist one or two issues marked as PRIORITY at the same time.<br>
This issues need to be handled before all others.

### `Requires breaking change`
A lot of code needs to be changed to implement this. This is maybe something for a major release or something for someone with a lot of time on their hands :-)

### `invalid`
This is a non-issue.<br>
Maybe somebody just created an empty issue, picked the wrong project or something like this.<br>
This can also be used for pull-request to a non-develop branch oder something similar.<br>
This issue or PR should be closed immediately.

### `waiting for answer/improvement`
This is mostly used for pull-requests were a review requested some change and the owner is not answering.
