const chalk = require('chalk');

const inquirer = require('inquirer');

const { getProjects, getProject, saveProject, getCollectives } = require('./lib/db');

const { getLocalPackageJson } = require('./lib/github');

const dependencyTypes = ['dependencies', 'peerDependencies', 'devDependencies'];

const stats = {};

const allProjects = getProjects();

const getPackageProject = packageName => allProjects.then(projects =>
  projects.find(project =>
    (project.packages || []).find(projectPackage => projectPackage.name === packageName)
  )
)

getCollectives.then(async collectives => {

  for (const collective of Object.values(collectives)) {

    if (!collective.githubRepo) {
      continue;
    }

    const packageJson = await getLocalPackageJson(collective.githubRepo);
    if (!packageJson) {
      continue;
    }

    for (const dependencyType of dependencyTypes) {
      if (packageJson[dependencyType]) {
        Object.keys(packageJson[dependencyType]).forEach(dependency => {
          stats[dependency] = stats[dependency] || {};
          stats[dependency][dependencyType] = stats[dependency][dependencyType] || 0;
          stats[dependency][dependencyType] ++;
        })
      }
    }
  }

  const packages = Object.keys(stats)
    .map(key => ({ name: key, ... stats[key] }))
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
    .filter(entry => entry.score >= 10)
    .sort((a, b) =>  b.score - a.score)
    .slice(0, 500);

  for (const packageObject of packages) {

    const project = await getPackageProject(packageObject.name);
    if (project) {
      console.log(chalk`{green ${packageObject.name}} already registered in {green ${project.name}}`);
      continue;
    }

    console.log('Package:', packageObject);

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: 'Skip', value: 'skip' },
          { name: 'Register project', value: 'register' },
          { name: 'Merge in other project', value: 'merge' },
          { name: 'Ignore', value: 'ignore' },
        ]
      },
      {
        type: 'input',
        name: 'slug',
        message: 'Slug',
        when: answers => answers.action === 'register' || answers.action === 'merge'
      }
    ]);

    // ACTION: register
    if (answers.action === 'register') {
      const project = {
        name: answers.slug,
        slug: answers.slug,
        packages: [
          packageObject
        ]
      }
      await saveProject(project);
    }

    // ACTION: merge
    if (answers.action === 'merge') {
      const project = await getProject(answers.slug);
      project.packages.push(packageObject);
      await saveProject(project);
    }

    // ACTION: ignore
    if (answers.action === 'ignore') {
      const project = {
        name: packageObject.name,
        slug: packageObject.name,
        ignored: true,
        packages: [
          packageObject
        ]
      }
      await saveProject(project);
    }
  }

});

