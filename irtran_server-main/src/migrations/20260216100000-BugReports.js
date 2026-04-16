'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bug_reports', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reporter_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      module_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'отправлено'
      },
      devtools_error: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      admin_response: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('bug_reports', ['user_id']);
    await queryInterface.addIndex('bug_reports', ['status']);
    await queryInterface.addIndex('bug_reports', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bug_reports');
  }
};
