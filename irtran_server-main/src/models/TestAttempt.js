const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const TestAttempt = sequelize.define(
  'TestAttempt',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    test_id: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    user_id: {
      type: DataTypes.STRING(255)
    },
    username: {
      type: DataTypes.STRING(255)
    },
    correct_answers: {
      type: DataTypes.INTEGER
    },
    question_count: {
      type: DataTypes.INTEGER
    },
    percent: {
      type: DataTypes.DECIMAL(5, 2)
    },
    status: {
      type: DataTypes.STRING(16)
    },
    started_at: {
      type: DataTypes.DATE
    },
    finished_at: {
      type: DataTypes.DATE
    },
    created_at: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: 'test_attempts',
    timestamps: false
  }
);

module.exports = TestAttempt;

