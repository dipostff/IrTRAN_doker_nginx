const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Scenario = sequelize.define(
  'Scenario',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.TEXT
    },
    storage_path: {
      type: DataTypes.STRING(512)
    },
    mime_type: {
      type: DataTypes.STRING(128)
    },
    size: {
      type: DataTypes.BIGINT
    },
    created_by_user_id: {
      type: DataTypes.STRING(255)
    },
    created_at: {
      type: DataTypes.DATE
    },
    updated_at: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: 'scenarios'
  }
);

module.exports = Scenario;

