const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const mkdirp = require('mkdirp-promise');

require('dotenv').config();

const DEBUG = process.env.DEBUG;

const force = false;

const githubDataPath = path.join(__dirname, '..', 'data', 'github');

if (!process.env.GITHUB_TOKEN) {
  throw Error(`Please set GITHUB_TOKEN environment variable.`);
}

function logGithubHeaders(response) {
  ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'].forEach(key => {
    const value = response.headers.get(key);
    if (value) {
      console.log(key, value);
    }
  })
}

function get(githubRepo, path) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  if (DEBUG) console.log('get', path, 'from', githubRepo);
  return fetch(`https://api.github.com/repos/${githubRepo}/contents/${path}?access_token=${process.env.GITHUB_TOKEN}`)
    .then(response => {
      if (DEBUG) {
        logGithubHeaders(response);
      }
      if (response.status !== 200) {
        throw new Error('Not a 200 response.');
      }
      return response.json();
    })
    .catch(e => {
      console.trace(e);
    })
}

function getFile(githubRepo, filename) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  if (DEBUG) console.log('get file', filename, 'from', githubRepo);
  return fetch(`https://raw.githubusercontent.com/${githubRepo}/master/${filename}`)
    .then(response => {
      if (response.status === 200) {
        return response.text();
      }
    })
    .catch(e => {
      console.trace(e);
    })
}

function getReadme(githubRepo) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  if (DEBUG) console.log('get readme from', githubRepo);
  return fetch(`https://api.github.com/repos/${githubRepo}/readme?access_token=${process.env.GITHUB_TOKEN}`)
    .then(response => {
      if (DEBUG) {
        logGithubHeaders(response);
      }
      if (response.status !== 200) {
        throw new Error('Not a 200 response.');
      }
      return response.json();
    })
    .then(json =>
      Buffer.from(json.content, 'base64').toString('utf8')
    )
    .catch(e => {
      console.trace(e);
    })
}

async function downloadFile(githubRepo, filename, dbEntry = {}) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  if (dbEntry[filename] === undefined || force) {
    if (DEBUG) console.log('download file', filename, 'in', githubRepo);
    const fileContent = await getFile(githubRepo, filename);
    if (fileContent) {
      dbEntry[filename] = true;
      await mkdirp(path.dirname(`${githubDataPath}/${githubRepo}/${filename}`));
      await fs.writeFile(`${githubDataPath}/${githubRepo}/${filename}`, fileContent);
    } else {
      dbEntry[filename] = false;
    }
  }
  return dbEntry[filename];
}

async function downloadReadme(githubRepo, dbEntry) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  if (dbEntry['readme'] === undefined || force) {
    if (DEBUG) console.log('download readme in', githubRepo);
    const readme = await getReadme(githubRepo);
    if (readme) {
      dbEntry['readme'] = true;
      await mkdirp(`${githubDataPath}/${githubRepo}`);
      await fs.writeFile(`${githubDataPath}/${githubRepo}/readme`, readme);
    } else {
      dbEntry['readme'] = false;
    }
  }
}

async function getLocalPackageJson(githubRepo) {
  githubRepo = githubRepo.replace('https://github.com/', '');
  return fs
    .readJson(`${githubDataPath}/${githubRepo}/package.json`)
    .catch(() => null);
}

module.exports = {
  get,
  getFile,
  getReadme,
  downloadFile,
  downloadReadme,
  getLocalPackageJson
}
