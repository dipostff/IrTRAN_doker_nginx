const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const OpenDayRun = sequelize.define(
  'OpenDayRun',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    client_run_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'started'
    },
    top: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    second: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    low: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    is_close: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    percent_pi: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    percent_is: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    percent_bas: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    percent_bi: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    question_ids: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration_sec: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE
    },
    updated_at: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: 'open_day_runs',
    timestamps: false
  }
);

module.exports = OpenDayRun;
