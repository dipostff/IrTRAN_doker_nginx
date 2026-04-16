const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const TestVariantQuestion = sequelize.define(
  'TestVariantQuestion',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    variant_id: {
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
    tableName: 'test_variant_questions',
    timestamps: false
  }
);

module.exports = TestVariantQuestion;

