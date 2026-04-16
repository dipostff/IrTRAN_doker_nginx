'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable('requests_transportation_submission_schedules', {
      id_request_transportation: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'requests_transportation', key: 'id' },
        onDelete: 'CASCADE'
      },
      id_submission_schedule: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: { model: 'submission_schedules', key: 'id' },
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
    await queryInterface.addConstraint('requests_transportation_submission_schedules', {
      fields: ['id_request_transportation', 'id_submission_schedule'],
      type: 'primary key',
      name: 'pk_rtss_irt_iss',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('requests_transportation_submission_schedules');
  }
};