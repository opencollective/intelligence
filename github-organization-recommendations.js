const path = require('path');
const fs = require('fs-extra');
const mkdirp = require('mkdirp-promise');
const _ = require('lodash');
const chalk = require('chalk');

const github = require('./lib/github');

const { getRawStatsWithProjectFromPackageJsonArray, scoreAndSortRawStats, jsonEncode } = require('./lib/utils');

const { getCollective } = require('./lib/db');
const { formatCurrency } = require('./lib/utils');

const parsedArgs = require('minimist')(process.argv.slice(2));
const force = false;

const orgsReposDataDir = path.join(__dirname, 'data', 'orgs', 'repos');

const getDataFilename = githubOrg => path.join(orgsReposDataDir, `${githubOrg}.json`);

const getOrgRepos = githubOrg =>
  fs.readJson(getDataFilename(githubOrg))
    .catch(() => {
      return Promise.all(
        // Brute force pagination handling
        Array.from(Array(20).keys()).map(n => github.getOrgRepos(githubOrg, n + 1))
      ).then(results => {
        return results.filter(r => r && r.length).reduce((acc, value) => [...acc, ...value], [])
      }).then(async repos => {
        await mkdirp(orgsReposDataDir);
        await fs.writeFile(getDataFilename(githubOrg), jsonEncode(repos))
        return repos;
      });
    })

const outputCollective = (collective, repos)  => {
  console.log(
    chalk`  {green ${collective.name}} {grey https://opencollective.com/${collective.slug || collective.name}}`
  );
  if (collective.description) {
    console.log(
      chalk`  {grey ${collective.description}}`
    )
  }
  if (!parsedArgs.compact && repos) {
    console.log('  Used in:');
    for (const repo of repos) {
      console.log(
        chalk`    - {cyan ${repo.name}} {grey https://github.com/${repo.full_name}}`
      );
    }
  }
  if (collective.sponsors) {
    console.log('  Top Sponsors:');
    for (const sponsor of collective.sponsors.slice(0, (parsedArgs.sponsors || 3))) {
      console.log(
        chalk`    - {cyan ${sponsor.name}} gave {yellow ${formatCurrency(sponsor.totalDonations)}} so far {grey https://opencollective.com/${sponsor.slug || sponsor.name}}`
      );
    }
  }
  console.log('');
}

const githubOrg = parsedArgs._[0];
if (!githubOrg) {
  throw new Error('You need to pass a githubOrg, such as "node organization-recommendations square"');
}

const type = parsedArgs._[1] || 'opencollective';

getOrgRepos(githubOrg)
  .then(async repos => {
    for (const repo of repos) {
      repo['_oc'] = force ? {} : repo['_oc'] || {};
      await github.downloadFile(repo.full_name, 'package.json', repo['_oc']);
    }
    await fs.writeFile(getDataFilename(githubOrg), jsonEncode(repos));
    return repos;
  })
  .then(repos =>
    repos.filter(repo => _.get(repo, ['_oc', 'package.json']) === true)
  ).then(repos => {
    // console.log(`${repos.length} repos with package.json detected`, repos.map(repo => repo.full_name));
    const packageJsonPromises = repos.map(repo =>
      github.getLocalPackageJson(repo.full_name).then(packageJson => ({packageJson, repo}))
    );

    Promise.all(packageJsonPromises)
      .then(packageJsonAndRepoArray =>
        getRawStatsWithProjectFromPackageJsonArray(packageJsonAndRepoArray)
      )
      .then(rawStats => {
        // console.log(rawStats);
        return scoreAndSortRawStats(rawStats)
      })
      .then(async recommendations => {
          // console.log(recommendations);
          const openCollectiveRecommendations = recommendations
            .filter(r => !!r.project.opencollective);
          if ((!type || type === 'opencollective') && openCollectiveRecommendations.length) {
            console.log(`\nBased on your dependencies, you should consider backing these Open Collectives:\n`);
            for (const { project, repos, score } of openCollectiveRecommendations) {
              const opencollective = await getCollective(project.opencollective.id);
              outputCollective(opencollective, Object.values(repos), score);
            }
          }

        const otherRecommendations = recommendations
          .filter(r => !r.project.opencollective)
          .filter(r => !r.project.ignored);
        if ((!type || type === 'other') && otherRecommendations.length) {
          console.log('You should consider pledging to these Open Source projects:');
          otherRecommendations.forEach(({ project, score }) => {
            console.log(' -', {
              name: project.name,
              packages: project.packages ? project.packages.length : null,
              score: score,
              // dependencyOf: uniq(collectives)
            });
          });
        }
      })

  });
