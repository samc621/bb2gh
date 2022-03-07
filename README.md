# bb2gh

When GitHub made private repos with unlimited collaborators a free core feature in 2019, many chose to migrate from Bitbucket.

You can use this script to automate that migration process.

The script assumes that you have SSH access to pull from Bitbucket and push to GitHub.

- [Bitbucket SSH instructions](https://support.atlassian.com/bitbucket-cloud/docs/set-up-an-ssh-key)
- [GitHub SSH instructions](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

## Environment

Add the following variables to your environment:

1. BB_USERNAME
2. BB_PASSWORD
3. BB_ORGANIZATION
4. GH_USERNAME
5. GH_PASSWORD
6. GH_ORGANIZATION

## Start

Run the following command from the root directory:

`$ npm start`
