'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.createTable('cargo', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255)
      },
      short_name: {
        type: DataTypes.STRING(255)
      },
      code_ETSNG: {
        type: DataTypes.STRING(255)
      },
      number_group: {
        type: DataTypes.STRING(255)
      },
      name_group: {
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

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('cargo');
  }
};