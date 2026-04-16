'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('test_variants', {
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_variants');
  }
};

