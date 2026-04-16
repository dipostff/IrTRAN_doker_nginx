'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('reference_documents', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: DataTypes.STRING(255)
      },
      filename: {
        type: DataTypes.STRING(255)
      },
      storage_path: {
        type: DataTypes.STRING(512)
      },
      mime_type: {
        type: DataTypes.STRING(128)
      },
      size: {
        type: DataTypes.BIGINT
      },
      text_content: {
        type: DataTypes.TEXT('long')
      },
      created_by_user_id: {
        type: DataTypes.STRING(255)
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    // Полнотекстовый индекс по названию и содержимому
    await queryInterface.addIndex('reference_documents', ['title', 'text_content'], {
      name: 'reference_documents_fulltext',
      type: 'FULLTEXT'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reference_documents');
  }
};

