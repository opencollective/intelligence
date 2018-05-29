const { getProjects, saveProject, getCollectives, getCollectivePackages } = require('./lib/db');

const collectivesWithPackages =
  getCollectives
    .then(collectives =>
      Promise
        .all(
          Object.values(collectives).map(collective =>
            new Promise(resolve =>
              getCollectivePackages(collective)
                .then(packages => {
                  collective.packageNames = [];
                  packages.forEach(content => {
                    if (content && content.name) {
                      collective.packageNames.push(content.name);
                    }
                  })
                  resolve(collective);
                })
              .catch(err => {
                console.trace(err);
                resolve(collective)
              })
            )
          )
        )
        .then(results => results.filter(collective => !!collective.packageNames))
    );

function matchPackageWithCollective (packageName) {
  return collectivesWithPackages
    .then(collectives =>
      collectives.find(collective =>
        collective.packageNames.find(collectivePackagename =>
          packageName === collectivePackagename
        )
      )
    );
}

getProjects()
  .then(async projects => {
    for (const project of projects) {
      console.log('Project:', project.name);
      for (const projectPackage of project.packages) {
        console.log('-> package:', projectPackage.name);
        await matchPackageWithCollective(projectPackage.name)
          .then(collective => {
            if (collective) {
              const { id, name, slug } = collective;
              console.log('  -> match:', { id, slug });
              project.opencollective = { id, name, slug };
              return saveProject(project);
            }
          })
          .catch((err) => {
            console.trace(err);
          });
      }
    }
  })
