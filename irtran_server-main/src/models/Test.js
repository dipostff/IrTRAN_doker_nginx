const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Test = sequelize.define(
  'Test',
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
    variant_mode: {
      // per_variant | single_shuffled
      type: DataTypes.STRING(32)
    },
    pass_percent: {
      // Минимальный процент для зачёта (0–100), null = без порога
      type: DataTypes.DECIMAL(5, 2)
    },
    max_attempts: {
      // Максимальное количество попыток (null или 0 = без ограничения)
      type: DataTypes.INTEGER.UNSIGNED
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
    tableName: 'tests'
  }
);

module.exports = Test;

