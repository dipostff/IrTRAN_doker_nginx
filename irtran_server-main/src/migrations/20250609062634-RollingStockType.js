'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('rolling_stock_types', {
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
      abbreviation: {
        type: DataTypes.STRING(255)
      },
      RPP: {
        type: DataTypes.STRING(255)
      },
      code_invoice_wagon: {
        type: DataTypes.STRING(255)
      },
      name_invoice_wagon: {
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

  async down(queryInterface) {
    await queryInterface.dropTable('rolling_stock_types');
  }
};