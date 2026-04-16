'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('payers', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      id_payer_type: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: {
          model: 'payer_types',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      id_country_transportation: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: {
          model: 'countries',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      id_payer: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: {
          model: 'legal_entities',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      OKPO: {
        type: DataTypes.STRING(255)
      },
      name: {
        type: DataTypes.STRING(255)
      },
      addr: {
        type: DataTypes.STRING(255)
      },
      note: {
        type: DataTypes.STRING(4095)
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
    await queryInterface.dropTable('payers');
  }
};