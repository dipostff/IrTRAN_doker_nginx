const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const ScenarioView = sequelize.define(
  'ScenarioView',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    scenario_id: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    user_id: {
      type: DataTypes.STRING(255)
    },
    username: {
      type: DataTypes.STRING(255)
    },
    first_viewed_at: {
      type: DataTypes.DATE
    },
    last_viewed_at: {
      type: DataTypes.DATE
    },
    completed: {
      type: DataTypes.BOOLEAN
    }
  },
  {
    tableName: 'scenario_views',
    timestamps: false
  }
);

module.exports = ScenarioView;

