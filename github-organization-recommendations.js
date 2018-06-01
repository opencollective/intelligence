const path = require('path');
const fs = require('fs-extra');
const mkdirp = require('mkdirp-promise');
const _ = require('lodash');

const github = require('./lib/github');
const { getRawStatsWithProjectFromPackageJsonArray, scoreAndSortRawStats, jsonEncode } = require('./lib/utils');

const orgsReposDataDir = path.join(__dirname, 'data', 'orgs', 'repos');

const getDataFilename = githubOrg => path.join(orgsReposDataDir, `${githubOrg}.json`);

const getOrgRepos = githubOrg => {
  return fs.readJson(getDataFilename(githubOrg))
    .catch(() => {
      return Promise.all(
        // Brute force pagination handling
        Array.from(Array(10).keys()).map(n => github.getOrgRepos(githubOrg, n + 1))
      ).then(results =>
        results.reduce((acc, value) => [...acc, ...value], [])
      ).then(async repos => {
        await mkdirp(orgsReposDataDir);
        await fs.writeFile(getDataFilename(githubOrg), jsonEncode(repos))
        return repos;
      });
    })
}

const githubOrg = process.argv[2];
if (!githubOrg) {
  throw new Error('You need to pass a githubOrg, such as "node organization-recommendations square"');
}

getOrgRepos(githubOrg)
  .then(async repos => {
    for (const repo of repos) {
      repo['_oc'] = repo['_oc'] || {};
      if (typeof repo['_oc']['package.json'] === 'undefined') {
        await github.downloadFile(repo.full_name, 'package.json', repo['_oc']);
      }
    }
    await fs.writeFile(getDataFilename(githubOrg), jsonEncode(repos));
    return repos;
  })
  .then(repos =>
    repos.filter(repo => _.get(repo, ['_oc', 'package.json']) === true)
  ).then(repos => {
    console.log(`${repos.length} repos with package.json detected`, repos.map(repo => repo.full_name));

    const packageJsonPromises = repos.map(repo => github.getLocalPackageJson(repo.full_name));

    Promise.all(packageJsonPromises)
      .then(packageJsonArray =>
        getRawStatsWithProjectFromPackageJsonArray(packageJsonArray.filter(el => !!el))
      )
      .then(rawStats => {
        // console.log(rawStats);
        return scoreAndSortRawStats(rawStats)
      })
      .then(recommendations => {
          // console.log(recommendations);
          const openCollectiveRecommendations = recommendations
            .filter(r => !!r.project.opencollective);
          if (openCollectiveRecommendations.length) {
            console.log('Based on these dependencies, you should consider backing these Open Collective projects:');
            openCollectiveRecommendations.forEach(({ project, score }) => {
              console.log(' -', {
                name: project.name,
                url: `https://opencollective.com/${project.slug || project.name}`,
                score: score,
                // dependencyOf: uniq(collectives)
              });
            });
          }

        const otherRecommendations = recommendations
          .filter(r => !r.project.opencollective)
          .filter(r => !r.project.ignored);
        if (otherRecommendations.length) {
          console.log('You should consider pledging to these Open Source projects:');
          otherRecommendations.forEach(({ project, score }) => {
            console.log(' -', {
              name: project.name,
              score: score,
              // dependencyOf: uniq(collectives)
            });
          });
        }
      })

  });
