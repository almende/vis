# HowTo Help

The company that developed vis.js for the main part, *almende* is [not able to maintain the project at the moment](./we_need_help.md). So help from the community is very needed and welcome!

## There are many ways to help:

### Answering questions

There are new [issues with questions](//github.com/almende/vis/issues?q=is%3Aissue+is%3Aopen+label%3AQuestion+sort%3Acreated-desc) how to use vis.js opened almost every day. Be part of the community and help answer them!

A better way to ask questions on how to use vis.js is [stackoverflow](https://stackoverflow.com/tags/vis.js). Questions are posed here also and need to be answered by the community. [Please help answering questions](https://stackoverflow.com/tags/vis.js) here also.

### Closing old issues

A new issue is often opened fast and then forgotten. Please help go trough [the old issues](//github.com/almende/vis/issues?q=is%3Aissue+is%3Aopen+sort%3Acreated-asc) (especially the [questions](//github.com/almende/vis/issues?q=is%3Aissue+is%3Aopen+sort%3Acreated-asc+label%3AQuestion)) and ask the creator of the issues if the problem still exists before closing the issue. The support team uses the **issue inactive** label to mark these issues.

### Improve the webpage

The visjs.org webpage is hosted on the [gh-pages branch](//github.com/almende/vis/tree/gh-pages). If you find a typo or anything else that should be improved feel free to create a pull-request to *gh-pages*. Please make changes in your own fork of gh-pages so the support team can view the changes in your hosted fork.

### Create new examples

We have [a collection of examples](//github.com/almende/vis/tree/develop/examples). Please help by creating interesting new ones that show a specific problem or layout. Keep the examples easy to understand for beginners and remove unnecessary clutter.

### Provide interesting showcases

If you use vis.js to develop something beautiful feel free to create a pull-request to our show cases page in the gh-pages branch](//github.com/almende/vis/tree/gh-pages/showcase). [These showcases are displayed on our webpage](http://visjs.org/showcase/index.html) and we are always looking for new examples.

### Confirming and fixing bugs

Every software has bugs. We also have [quite a nice collection](https://github.com/almende/vis/issues?q=is%3Aissue+is%3Aopen+label%3ABug+sort%3Areactions-%2B1-desc) ;-)
Feel free to fix as many bugs as you want!

You can not only help by fixing bugs, but also by confirming the bug or even creating a minimal code example to prove this bug exists.

### Implementing Feature-Requests

A lot of people have a lot of ideas for improving vis.js. [We label these issues as **Feature-Request**](https://github.com/almende/vis/labels/Feature-Request). Feel free to implement a new feature by creating a new Pull-Request.

[Some issues are labeled **For everybody!**](//github.com/almende/vis/issues?q=is%3Aissue+is%3Aopen+label%3A%22For+everyone%21%22+sort%3Areactions-%2B1-desc). These are a good starting point.

### Reviewing Pull-Requests

We use [GitHub's two-step review](//help.github.com/articles/about-pull-request-reviews/) to make sure pull-requests are clean. You can help by checking out pull-request branches and testing them. You also can comment on lines of code and make sure the pull-request introduces no new bugs or typos.

## Creating Pull Requests

There are some rules for pull-request:

* All pull-request must be to the [develop-branch](//github.com/almende/vis/tree/develop). Pull-request against the [master-branch](//github.com/almende/vis/tree/master) must be closed. (Changes to [gh-pages](//github.com/almende/vis/tree/gh-pages) are also ok.)

* Only commit changes done in the source files in the folder `lib`, not to the builds
  which are located in the folder `dist`.

* Keep your changes small and clear. Only work on one topic at one time and only change lines of code that you have to change to reach your goal.

* Test your changes before creating a pull-request. The easiest way is to open the existing examples and playing with them.

* If you are fixing or implementing an existing issue, please refer to it in the description and in the commit message.

* If you are introducing a new feature, add some documentation and a new example to make it easy to adapt.

* If you introduce breaking changes, like changing the signature of a public function, point that out in your description. Breaking changes result in a new major release.

* Always adapt to the code style of the existing source. Never adapt existing code to your personal taste. :trollface:

* Pull-requests must be reviewed by at least two member of the support team. The First must approve the pull-request, the second can than merge after also checking it.

**Happy Helping!!**
