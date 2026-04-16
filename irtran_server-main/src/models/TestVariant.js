const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const TestVariant = sequelize.define(
  'TestVariant',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    test_id: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    label: {
      type: DataTypes.STRING(100)
    }
  },
  {
    tableName: 'test_variants',
    timestamps: false
  }
);

module.exports = TestVariant;

