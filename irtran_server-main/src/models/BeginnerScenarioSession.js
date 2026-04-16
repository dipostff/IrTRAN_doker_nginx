const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const BeginnerScenarioSession = sequelize.define(
  'BeginnerScenarioSession',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ended_at: DataTypes.DATE,
    duration_seconds: DataTypes.INTEGER.UNSIGNED,
    documents_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0
    }
  },
  {
    tableName: 'beginner_scenario_sessions',
    timestamps: false
  }
);

module.exports = BeginnerScenarioSession;
