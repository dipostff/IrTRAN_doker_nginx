const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const LegalEntities = sequelize.define('LegalEntities', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255)
  },
  OKPO: {
    type: DataTypes.STRING(255)
  },
  TGNL_code: {
    type: DataTypes.STRING(255)
  },
  INN: {
    type: DataTypes.STRING(255)
  },
  id_business: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_holding: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  name_holding: {
    type: DataTypes.STRING(255)
  },
}, {
  tableName: 'legal_entities'
});

module.exports = LegalEntities;