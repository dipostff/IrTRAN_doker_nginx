'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('requests_transportation_sending', {
      id_request_transportation: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'requests_transportation', key: 'id' },
        onDelete: 'CASCADE'
      },
      id_sending: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'sending', key: 'id' },
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
    await queryInterface.addConstraint('requests_transportation_sending', {
      fields: ['id_request_transportation', 'id_sending'],
      type: 'primary key',
      name: 'pk_rts_irt_is',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('requests_transportation_sending');
  }
};