const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');


const OwnerNonPublicRailway = sequelize.define('OwnerNonPublicRailway', {
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
  tableName: 'owners_non_public_railway'
});

module.exports = OwnerNonPublicRailway;