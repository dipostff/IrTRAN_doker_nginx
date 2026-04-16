'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.createTable('signs_sending', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255)
      },
      code: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      created_at: { 
        type: DataTypes.DATE 
      },
      updated_at: { 
        type: DataTypes.DATE 
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('signs_sending');
  }
};