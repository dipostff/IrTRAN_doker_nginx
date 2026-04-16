const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const BugReport = sequelize.define('BugReport', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reporter_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  module_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'отправлено'
  },
  devtools_error: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  screenshot_paths: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  admin_response: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'bug_reports',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BugReport;
