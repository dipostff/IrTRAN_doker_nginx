'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_reviews', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      document_source: {
        type: Sequelize.STRING(32),
        allowNull: false
      },
      document_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      document_type: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      student_user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      version_no: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'submitted'
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reviewed_by_teacher_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      check_mode: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      algorithm_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      algorithm_recommendation: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      grade: {
        type: Sequelize.STRING(16),
        allowNull: true
      },
      acceptance: {
        type: Sequelize.STRING(16),
        allowNull: true
      },
      teacher_comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      can_rework: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      payload_snapshot: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('document_reviews', ['student_user_id']);
    await queryInterface.addIndex('document_reviews', ['status']);
    await queryInterface.addIndex('document_reviews', ['document_source', 'document_id', 'version_no'], {
      unique: true,
      name: 'document_reviews_doc_version_uq'
    });

    await queryInterface.createTable('document_review_templates', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      document_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      updated_by_user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addColumn('student_documents', 'latest_review_status', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('student_documents', 'latest_review_grade', {
      type: Sequelize.STRING(16),
      allowNull: true
    });
    await queryInterface.addColumn('student_documents', 'latest_review_acceptance', {
      type: Sequelize.STRING(16),
      allowNull: true
    });
    await queryInterface.addColumn('student_documents', 'latest_review_can_rework', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });
    await queryInterface.addColumn('student_documents', 'latest_reviewed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('student_documents', 'latest_reviewed_at');
    await queryInterface.removeColumn('student_documents', 'latest_review_can_rework');
    await queryInterface.removeColumn('student_documents', 'latest_review_acceptance');
    await queryInterface.removeColumn('student_documents', 'latest_review_grade');
    await queryInterface.removeColumn('student_documents', 'latest_review_status');
    await queryInterface.dropTable('document_review_templates');
    await queryInterface.dropTable('document_reviews');
  }
};
