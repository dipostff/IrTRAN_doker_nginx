'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('test_variant_questions', {
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
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_variant_questions');
  }
};

