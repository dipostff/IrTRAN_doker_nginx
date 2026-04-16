'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_documents', 'is_exemplar', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('student_documents', 'exemplar_title', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('student_documents', 'reference_exemplar_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true
    });
    await queryInterface.addIndex('student_documents', ['is_exemplar']);
    await queryInterface.addIndex('student_documents', ['reference_exemplar_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('student_documents', ['reference_exemplar_id']);
    await queryInterface.removeIndex('student_documents', ['is_exemplar']);
    await queryInterface.removeColumn('student_documents', 'reference_exemplar_id');
    await queryInterface.removeColumn('student_documents', 'exemplar_title');
    await queryInterface.removeColumn('student_documents', 'is_exemplar');
  }
};
