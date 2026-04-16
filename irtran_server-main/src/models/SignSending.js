const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const SignSending = sequelize.define('SignSending', {
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
}, {
  tableName: 'signs_sending'
});

module.exports = SignSending;