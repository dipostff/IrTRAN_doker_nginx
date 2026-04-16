'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.createTable('countries', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255)
      },
      OSCM_code: {
        type: DataTypes.STRING(255)
      },
      short_name: {
        type: DataTypes.STRING(255)
      },
      COATO_code: {
        type: DataTypes.STRING(255)
      },
      OSZhD_code: {
        type: DataTypes.STRING(255)
      },
      type_state: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      administration_code_digit: {
        type: DataTypes.STRING(255)
      },
      order_number: {
        type: DataTypes.STRING(255)
      },
      administration_code_symbol: {
        type: DataTypes.STRING(255)
      },
      country_code_ISO_3166: {
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
    await queryInterface.dropTable('countries');
  }
};