const fs = require('fs-extra');

const path = require('path');

const jsonEncode = data => JSON.stringify(data, null, 2);

const collectivesFilename = path.join(__dirname, '..', 'data', 'collectives.json');

const projectsDataPath = path.join(__dirname, '..', 'data', 'projects');

const getCollectives = fs.readJson(collectivesFilename).catch(() => {});

const getCollective = id => getCollectives.then(all => all[id]);

exports.saveCollectives = db => fs.writeFileSync(collectivesFilename, jsonEncode(db));

exports.getProjects = async () => {
  return fs.readdir(projectsDataPath).then(async filenames => {
    const projects = [];
    for (const filename of filenames) {
      const project = await fs.readJson(path.join(projectsDataPath, filename));
      projects.push(project);
    }
    return projects;
  });
}

exports.getProject = slug => {
  return fs.readJson(path.join(projectsDataPath `${slug}.json`));
}

exports.saveProject = project => {
  const slug = project.slug || project.name;
  return fs.writeFile(path.join(projectsDataPath, `${slug}.json`), jsonEncode(project));
}

// exports.getPackages = async () => {
//   return fs.readdir(path.join(__dirname, 'packages')).then(async filenames => {
//     const packages = [];
//     for (const filename of filenames) {
//       packages.push({
//         id: filename.replace('.json', ''),
//         json: fs.readJson(path.join(__dirname, 'packages', filename))
//       });
//     }
//     return packages;
//   });
// }

// exports.getPackage = async (collectiveId) => {
//   return fs.readJson(path.join(__dirname, 'packages', `${collectiveId}.json`))
// }

exports.getCollectivePackages = collective => {
  const packages = [];
  if (collective.githubRepo && collective['package.json']) {
    packages.push(
      fs
        .readJson(path.join(__dirname, '..', 'data', 'github', collective.githubRepo, 'package.json'))
        // .catch((err) => { console.error(err); return null; })
        .catch(() => null )
    );
  }
  if (collective.lernaPackages) {
    collective.lernaPackages.forEach(lernaPackage => {
      packages.push(
        fs
          .readJson(path.join(__dirname, '..', 'data', 'github', collective.githubRepo, lernaPackage, 'package.json'))
          // .catch((err) => { console.error(err); return null; })
          .catch(() => null )
      );
    });
  }
  return Promise.all(packages);
}

exports.getCollective = getCollective;

exports.getCollectives = getCollectives;

