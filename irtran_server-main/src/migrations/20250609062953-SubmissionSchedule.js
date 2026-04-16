'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('submission_schedules', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      id_send_number: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      submission_date: {
        type: DataTypes.DATE
      },
      weight: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      count_wagon: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    await queryInterface.addConstraint('submission_schedules', {
      fields: ['id_send_number'],
      type: 'foreign key',
      name: 'fk_submission_schedules_send_number',
      references: {
        table: 'send_numbers',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'submission_schedules', 
      'fk_submission_schedules_send_number'
    );
    await queryInterface.dropTable('submission_schedules');
  }
};