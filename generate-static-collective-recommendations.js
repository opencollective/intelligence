const path = require('path');

const fs = require('fs-extra');

const { getCollectives } = require('./lib/db');

const { getLocalPackageJson } = require('./lib/github');

const { getRawStatsWithProjectFromPackageJsonArray, scoreAndSortRawStats } = require('./lib/utils');

getCollectives.then(async collectives => {

  const entries = {};

  for (const collective of Object.values(collectives)) {

    const packageJsonPromises = [];
    if (collective.githubRepo) {
      if (collective['package.json']) {
        packageJsonPromises.push(getLocalPackageJson(collective.githubRepo));
      }
      if (collective.lernaPackages) {
        collective.lernaPackages.forEach(lernaPackage => {
          packageJsonPromises.push(getLocalPackageJson(`${collective.githubRepo}/${lernaPackage}`))
        })
      }
    }

    const entry = await Promise.all(packageJsonPromises).then(async packageJsonArray => {

      const rawStats = await getRawStatsWithProjectFromPackageJsonArray(packageJsonArray.filter(el => !!el));

      const recommendations = scoreAndSortRawStats(rawStats)
        .filter(r => !!r.project.opencollective)
        .filter(r => r.project.opencollective.id !== collective.id)
        .map(r => ({ ... r.project.opencollective, score: r.score }) )
        .slice(0, 10);

      return { id: collective.id, slug: collective.slug, recommendations };
    });

    if (entry && entry.recommendations.length) {
      entries[collective.id] = entry;
    }
  }

  await fs.writeFile(
    path.join(__dirname, 'data', 'collective-recommendations.json'),
    JSON.stringify(entries, null, 2)
  );

});
