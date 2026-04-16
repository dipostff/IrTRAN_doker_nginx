const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const CargoGroup = sequelize.define('CargoGroup', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255)
  },
  code: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  min_load: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  max_load: {
    type: DataTypes.INTEGER.UNSIGNED
  },
}, {
  tableName: 'cargo_groups'
});

module.exports = CargoGroup;