require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw Error(`Please set DATABASE_URL environment variable.`);
}

const Sequelize = require('sequelize');

module.exports = new Sequelize(process.env.DATABASE_URL, {
  operatorsAliases: false,
  dialectOptions: { ssl: true }
});
