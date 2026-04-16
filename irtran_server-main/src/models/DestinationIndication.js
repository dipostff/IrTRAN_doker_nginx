const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const DestinationIndication = sequelize.define('DestinationIndication', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
    note: {
      type: DataTypes.STRING(4095)
    },
    code: {
      type: DataTypes.INTEGER.UNSIGNED
    }
  }, {
    tableName: 'destination_indications'
  }
);

module.exports = DestinationIndication;
