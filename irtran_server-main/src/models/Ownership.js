const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Ownership = sequelize.define('Ownership', {
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
  }
}, {
  tableName: 'ownerships'
});

module.exports = Ownership;