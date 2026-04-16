'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.createTable('legal_entities', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255)
      },
      OKPO: {
        type: DataTypes.STRING(255)
      },
      TGNL_code: {
        type: DataTypes.STRING(255)
      },
      INN: {
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
    await queryInterface.dropTable('legal_entities');
  }
};