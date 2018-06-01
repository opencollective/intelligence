Intelligence Experiments
------------------------

A project to run analytics experiments on OpenCollective data, to help
the company and users make better decisions on the platform.

## Install

```
npm install
# Copy and configure with your own GitHub token and DB credentials
cp sample.env .env
```

## Update Data

Optional

1. `node download-data` (need DB credentials and Github Token)
2. `node register-projects`
3. `node map-projects-collective`

## Open Collective Recommendations

Make recommendations for which collectives an organization on
OpenCollective.com should support.

`node collective-recommendations {openCollective-slug}`

**Note:** `collective-slug' data is fetched from production website, not
the database configured in this repo.

eg:

`node collective-recommendations airbnb`

## Github Organization Recommendations

`node github-organization-recommendations {githubOrganization-slug}`

eg:

`node github-organization-recommendations square`
