'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('training_scenario_snapshots', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      doc_type: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      doc_ref: {
        type: Sequelize.STRING(191),
        allowNull: false
      },
      done_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      total_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      done_step_ids: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
    await queryInterface.addIndex('training_scenario_snapshots', ['user_id']);
    await queryInterface.addIndex('training_scenario_snapshots', ['doc_type']);
    await queryInterface.addIndex('training_scenario_snapshots', ['updated_at']);
    await queryInterface.addIndex(
      'training_scenario_snapshots',
      ['user_id', 'doc_type', 'doc_ref'],
      {
        unique: true,
        name: 'training_scenario_user_doc_unique'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('training_scenario_snapshots');
  }
};
