const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const SendNumber = sequelize.define('SendNumber', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
  }, {
    tableName: 'send_numbers'
  }
);

module.exports = SendNumber;
