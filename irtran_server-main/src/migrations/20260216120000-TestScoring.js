'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    // Добавляем поля для порога прохождения и максимального числа попыток в tests
    await queryInterface.addColumn('tests', 'pass_percent', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    });
    await queryInterface.addColumn('tests', 'max_attempts', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    });

    // Баллы за вопрос в single_shuffled
    await queryInterface.addColumn('test_questions', 'points', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    });

    // Баллы за вопрос в per_variant
    await queryInterface.addColumn('test_variant_questions', 'points', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tests', 'pass_percent');
    await queryInterface.removeColumn('tests', 'max_attempts');
    await queryInterface.removeColumn('test_questions', 'points');
    await queryInterface.removeColumn('test_variant_questions', 'points');
  }
};

