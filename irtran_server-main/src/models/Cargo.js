const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Cargo = sequelize.define('Cargo', {
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
    code_ETSNG: {
      type: DataTypes.STRING(255)
    },
    number_group: {
      type: DataTypes.STRING(255)
    },
    name_group: {
      type: DataTypes.STRING(255)
    },
  }, {
    tableName: 'cargo'
  }
);

module.exports = Cargo;
