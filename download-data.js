const github = require('./lib/github');
const sequelize = require('./lib/sequelize');
const { getCollectives, saveCollectives } = require('./lib/db');

const query = sequelize.query(
  `SELECT * FROM "public"."Collectives"
   WHERE ("settings"::TEXT ILIKE '%githubRepo%' OR "settings"::TEXT ILIKE '%githubOrg%')
   AND ("isActive" = true)
   ORDER BY "id" DESC, "id" DESC`,
{ type: sequelize.QueryTypes.SELECT });

async function checkCollectives(collectives, db) {

  for (const collective of collectives) {

    const { id, slug, name } = collective;

    console.log('Processing', { id, slug });

    const dbEntry = db[id] = db[id] || { id, slug, name };

    if (collective.settings && collective.settings.githubRepo) {
      dbEntry['githubRepo'] = collective.settings.githubRepo;
    } else if (collective.settings && collective.settings.githubOrg) {
      dbEntry['githubOrg'] = collective.settings.githubOrg;
    }

    // Detecting githubRepo from githubOrg
    if (!dbEntry['githubRepo'] && dbEntry['githubOrg']) {
      console.log(' -> detecting githubRepo from githubOrg:', collective.settings.githubOrg);
      if (collective.data && collective.data.repos) {
        const repos = collective.data.repos;
        const repo = Object.keys(repos)
          .map(key => ({ name: key, stars: repos[key].stars }))
          .sort((a, b) => b.stars - a.stars)
          .shift();
        if (repo) {
          console.log(' -> detected githubRepo: ', repo.name);
          dbEntry['githubRepo'] = `${dbEntry['githubOrg']}/${repo.name}`;
        }
      }
    }

    // Warning and Breaking
    if (!dbEntry['githubRepo']) {
      console.warn(' -> no githubRepo for collective', dbEntry);
      break;
    }

    dbEntry['githubRepo'] = dbEntry['githubRepo'].replace('https://github.com/', '');

    const githubRepo = dbEntry['githubRepo'];

    // Package.json
    await github.downloadFile(githubRepo, 'package.json', dbEntry);

    // Readme
    await github.downloadReadme(githubRepo, dbEntry);

    // Process Lerna packages
    const lerna = await github.downloadFile(githubRepo, 'lerna.json', dbEntry);
    if (lerna) {
      console.log(` -> lerna detected in`, githubRepo);
      let lernaPackages, lernaFolderName;
      for (lernaFolderName of ['packages', 'modules', 'app']) {
        lernaPackages = await github.get(githubRepo, lernaFolderName);
        if (lernaPackages) {
          break;
        }
      }
      lernaPackages = lernaPackages.filter(result => result.type === 'dir');
      dbEntry['lernaPackages'] = [];
      for (const lernaPackage of lernaPackages) {
        if (dbEntry['lernaPackages'].indexOf(`${lernaFolderName}/${lernaPackage.name}`) === -1) {
          dbEntry['lernaPackages'].push(`${lernaFolderName}/${lernaPackage.name}`);
          await github.downloadFile(dbEntry['githubRepo'], `packages/${lernaPackage.name}/package.json`, dbEntry);
        }
      }
    }

    saveCollectives(db);
  }

}

async function main() {
  getCollectives.then(db => {
    query.then(collectives => {
      sequelize.close();
      checkCollectives(collectives, db);
    })
  })
}

main();
