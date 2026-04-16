const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const RollingStockType = sequelize.define('RollingStockType', {
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
    abbreviation: {
      type: DataTypes.STRING(255)
    },
    RPP: {
      type: DataTypes.STRING(255)
    },
    code_invoice_wagon: {
      type: DataTypes.STRING(255)
    },
    name_invoice_wagon: {
      type: DataTypes.STRING(255)
    },
  }, {
    tableName: 'rolling_stock_types'
  }
);

module.exports = RollingStockType;
