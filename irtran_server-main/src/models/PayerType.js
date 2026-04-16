const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const PayerType = sequelize.define('PayerType', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
  }, {
    tableName: 'payer_types'
  }
);

module.exports = PayerType;
