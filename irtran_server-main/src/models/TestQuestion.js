const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const TestQuestion = sequelize.define(
  'TestQuestion',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    test_id: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    question_id: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    order: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    points: {
      type: DataTypes.INTEGER.UNSIGNED
    }
  },
  {
    tableName: 'test_questions',
    timestamps: false
  }
);

module.exports = TestQuestion;

