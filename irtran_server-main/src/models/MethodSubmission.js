const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const MethodSubmission = sequelize.define('MethodSubmission', {
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
  tableName: 'methods_submission'
});

module.exports = MethodSubmission;