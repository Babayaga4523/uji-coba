const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("rental", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

module.exports = sequelize;
