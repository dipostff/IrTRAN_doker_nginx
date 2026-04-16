const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const TrainingScenarioSnapshot = sequelize.define(
  'TrainingScenarioSnapshot',
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
    username: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    doc_type: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    doc_ref: {
      type: DataTypes.STRING(191),
      allowNull: false
    },
    done_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    done_step_ids: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: 'training_scenario_snapshots',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = TrainingScenarioSnapshot;
