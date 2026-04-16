'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('sending_destination_indications', {
      id_sending: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'sending', key: 'id' },
        onDelete: 'CASCADE'
      },
      id_destination_indication: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'destination_indications', key: 'id' },
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
    await queryInterface.addConstraint('sending_destination_indications', {
      fields: ['id_sending', 'id_destination_indication'],
      type: 'primary key',
      name: 'pk_sdi_is_idi',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sending_destination_indications');
  }
};