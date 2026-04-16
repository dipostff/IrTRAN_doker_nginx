const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const SendType = sequelize.define('SendType', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
    code_IODV: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    abbreviation: {
      type: DataTypes.STRING(255)
    },
    code_CO_11: {
      type: DataTypes.INTEGER.UNSIGNED
    }
  }, {
    tableName: 'send_types'
  }
);

module.exports = SendType;
