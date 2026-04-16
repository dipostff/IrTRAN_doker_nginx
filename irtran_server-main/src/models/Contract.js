const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Contract = sequelize.define('Contract', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
    short_name: {
      type: DataTypes.STRING(255)
    },
    code: {
      type: DataTypes.INTEGER.UNSIGNED
    }
  }, {
    tableName: 'contracts'
  }
);

module.exports = Contract;
