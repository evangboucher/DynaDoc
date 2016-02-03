### Contribution guidelines ###

* DynaDoc requires mocha tests for every pull request and feature added. Your pull request may not be accepted if the tests do not pass or breaks other tests.
* Tests can be run from your own AWS account. You can provide a awscreds.json file in the /test directory. This file contains the secret key and access key for your AWS account (a user with full access to DynamoDB is succficient). If you open a new free tier account, you should not be charged anything for a successful pass of the test. If the test fails critically, it is possible that tables will be left. You may need to monitor and delete any residual tables left from critically failing tests.
* All pull requests are reviewed and will be merged once approved by the author or repository authorities.
* DynaDoc aims to have detailed comments, APIs, and descriptions of functions and lines. You should throughly test functionality and produce the leanest code possible. I am happy to work with you in order to help improve and implement new features and code.
