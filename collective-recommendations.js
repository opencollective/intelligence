const { pick, uniq } = require('lodash');

const { request } = require('graphql-request');

const { getCollectives, getProjects } = require('./lib/db');

const { getLocalPackageJson } = require('./lib/github');

const { scoreAndSortRawStats } = require('./lib/utils');

const dependencyTypes = ['dependencies', 'peerDependencies', 'devDependencies'];

const getCollectiveQuery = `
  query Collective($slug: String!) {
    Collective(slug: $slug) {
      id
      name
      slug
      path
      type
      ... on User {
        memberOf(limit: 60) {
          id
          role
          createdAt
          collective {
            id
            name
            slug
            path
            type
          }
        }
      }
      ... on Organization {
        memberOf(limit: 60) {
          id
          role
          createdAt
          collective {
            id
            name
            slug
            path
            type
          }
        }
      }
    }
  }
`;

const slug = process.argv[2];
if (!slug) {
  throw new Error('You need to pass a slug, such as "node collective-recommendations airbnb"');
}

const params = { slug: slug };

const allProjects = getProjects();

const getProjectFromDependency = async dependency =>
  allProjects.then(projects =>
    projects.find(project =>
      project.packages.find(p => p.name === dependency)
    )
  );

request('https://opencollective.com/api/graphql', getCollectiveQuery, params)
  .then(data => {

    console.log('Here are the recommendations for', data.Collective.name);

    const backing = data.Collective.memberOf.filter(r => r.role === 'BACKER');

    console.log('');
    console.log('Currently backing the following Open Collectives:');

    backing.forEach(m => {
      console.log(' *',
        { name: m.collective.name },
        { url: `https://opencollective.com/${m.collective.slug}` }
      );
    });

    const collectiveIds = backing.map(r => r.collective.id);

    getCollectives().then(
      cs => Object.values(cs).filter(c => collectiveIds.indexOf(c.id) !== -1)
    ).then(collectives =>
      collectives.map(c => pick(c, 'id', 'name', 'slug', 'githubRepo', 'package.json'))
    ).then(collectives => {

      // Collecting all package.json to process
      const allPackageJson = [];
      for (const collective of collectives) {
        if (collective.githubRepo && collective['package.json']) {
          allPackageJson.push(new Promise((resolve) => {
            getLocalPackageJson(collective.githubRepo)
              .then(packageJson => resolve({ collective, packageJson }))
              .catch(() => resolve())
          }));
        }
      }

      Promise.all(allPackageJson).then(async results => {
        const rawStats = {};

        for (const result of results) {
          if (!result) return;
          const { packageJson, collective } = result;
          for (const dependencyType of dependencyTypes) {
            if (packageJson[dependencyType]) {
              for (const dependency of Object.keys(packageJson[dependencyType])) {
                const project = await getProjectFromDependency(dependency);
                if (project) {
                  const id = project.slug || project.name;
                  if (!rawStats[id]) {
                    rawStats[id] = { id: id, project: project, 'collectives': [] }
                  }
                  rawStats[id][dependencyType] = rawStats[id][dependencyType] || 0;
                  rawStats[id][dependencyType] ++;
                  rawStats[id]['collectives'].push(collective.name);
                }
              }
            }
          }
        }

        const recommendations = scoreAndSortRawStats(rawStats);

        const openCollectiveRecommendations = recommendations
          .filter(r => !!r.project.opencollective)
          .filter(r => collectiveIds.indexOf(r.project.opencollective.id) === -1);

        if (openCollectiveRecommendations.length) {
          console.log('');
          console.log('You should consider backing these Open Collective projects:');
          openCollectiveRecommendations.slice(0, 3).forEach(({ project, score, collectives }) => {
            console.log(' *', {
              name: project.name,
              url: `https://opencollective.com/${project.slug || project.name}`,
              score: score,
              dependencyOf: uniq(collectives)
            });
          });
        }

        const otherRecommendations = recommendations
          .filter(r => !r.project.slug || r.project.slug[0] !== '_')
          .filter(r => !r.project.name || r.project.name[0] !== '_')
          .filter(r => !r.project.opencollective);

        if (otherRecommendations.length) {
          console.log('');
          console.log('You should consider pledging to these Open Source projects:');
          otherRecommendations.slice(0, 3).forEach(({ project, score, collectives }) => {
            console.log(' *', {
              name: project.name,
              score: score,
              dependencyOf: uniq(collectives)
            });
          });
        }
    });

  });
});
