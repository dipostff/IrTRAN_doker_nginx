'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_documents', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      document_type: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true
      },
      deleted_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('student_documents', ['user_id']);
    await queryInterface.addIndex('student_documents', ['document_type']);
    await queryInterface.addIndex('student_documents', ['deleted_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_documents');
  }
};
