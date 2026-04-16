const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const LearningDeadline = sequelize.define(
  'LearningDeadline',
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
    entity_type: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    deadline_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigned_by_user_id: {
      type: DataTypes.STRING(255),
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
    tableName: 'learning_deadlines',
    timestamps: false
  }
);

module.exports = LearningDeadline;
