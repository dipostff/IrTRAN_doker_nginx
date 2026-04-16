'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('tests', {
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
        type: DataTypes.STRING(32)
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tests');
  }
};

