'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('requests_transportation_payers', {
      id_request_transportation: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'requests_transportation', key: 'id' },
        onDelete: 'CASCADE'
      },
      id_payer: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'payers', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    // Добавляем композитный уникальный ключ
    await queryInterface.addConstraint('requests_transportation_payers', {
      fields: ['id_request_transportation', 'id_payer'],
      type: 'primary key',
      name: 'pk_rtp_irt_ip',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('requests_transportation_payers');
  }
};