const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');


const ApprovalWithOwner = sequelize.define('ApprovalWithOwner', {
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
  tableName: 'approvals_with_owner'
});

module.exports = ApprovalWithOwner;