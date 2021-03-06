const dependencyTypes = ['dependencies', 'peerDependencies', 'devDependencies'];

const { getProjects } = require('./db');

const allProjects = getProjects();

const jsonEncode = data => JSON.stringify(data, null, 2);

const getProjectFromDependency = async dependency =>
  allProjects.then(projects =>
    projects.find(project =>
      project.packages.find(p => p.name === dependency)
    )
  );

function getRawStatsFromPackageJsonArray(packageJsonArray) {
  const rawStats = [];

  for (const packageJson of packageJsonArray) {
    for (const dependencyType of dependencyTypes) {
      if (packageJson[dependencyType]) {
        for (const dependency of Object.keys(packageJson[dependencyType])) {
          rawStats[dependency] = rawStats[dependency] || {};
          rawStats[dependency][dependencyType] = rawStats[dependency][dependencyType] || 0;
          rawStats[dependency][dependencyType] ++;
        }
      }
    }
  }

  return rawStats;
}

async function getRawStatsWithProjectFromPackageJsonArray(packageJsonAndRepoArray) {
  const rawStats = [];

  for (const { packageJson, repo } of packageJsonAndRepoArray) {
    if (!packageJson) {
      continue;
    }
    for (const dependencyType of dependencyTypes) {
      if (packageJson[dependencyType]) {
        for (const dependency of Object.keys(packageJson[dependencyType])) {
          let project = await getProjectFromDependency(dependency);
          if (!project) {
            project = { slug: dependency, name: dependency };
          }
          if (project) {
            const id = project.slug || project.name;
            if (!rawStats[id]) {
              rawStats[id] = { id: id, project: project, 'repos': {} }
            }
            rawStats[id] = rawStats[id] || {};
            rawStats[id][dependencyType] = rawStats[id][dependencyType] || 0;
            rawStats[id][dependencyType] ++;
            rawStats[id]['repos'][repo.id] = repo;
          }
        }
      }
    }
  }

  return rawStats;
}

function scoreAndSortRawStats(rawStats) {
  return Object.keys(rawStats)
    .map(key => ({ name: key, ... rawStats[key] }))
    .map(entry => {
      entry.score = 0;
      for (const dependencyType of dependencyTypes) {
        if (entry[dependencyType]) {
          if (dependencyType === 'dependencies') {
             entry.score += entry[dependencyType] * 3;
           } else {
             entry.score += entry[dependencyType];
           }
        }
      }
      return entry;
    })
    .sort((a, b) =>  b.score - a.score)
}


function getLocaleFromCurrency(currency) {
  let locale;
  switch (currency) {
    case 'USD':
      locale = 'en-US';
      break;
    case 'EUR':
      locale = 'en-EU';
      break;
    default:
      locale = currency;
  }
  return locale;
}

function formatCurrency(amount, currency = 'USD', options = { precision: 0 }) {
  amount = amount / 100;

  let minimumFractionDigits = 2;
  let maximumFractionDigits = 2;

  if (options.hasOwnProperty('minimumFractionDigits')) {
    minimumFractionDigits = options.minimumFractionDigits
  } else if (options.hasOwnProperty('precision')) {
    minimumFractionDigits = options.precision;
    maximumFractionDigits = options.precision;
  }

  return amount.toLocaleString(getLocaleFromCurrency(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits : minimumFractionDigits,
    maximumFractionDigits : maximumFractionDigits
  })
}

module.exports = {
  jsonEncode,
  formatCurrency,
  getRawStatsFromPackageJsonArray,
  getRawStatsWithProjectFromPackageJsonArray,
  scoreAndSortRawStats
}
