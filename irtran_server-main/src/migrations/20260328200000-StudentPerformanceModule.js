'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_profiles', {
      user_id: {
        type: Sequelize.STRING(255),
        primaryKey: true
      },
      phone: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      patronymic: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      academic_group: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      student_book_id: {
        type: Sequelize.STRING(128),
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

    await queryInterface.createTable('student_profile_change_requests', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'pending'
      },
      review_comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewer_user_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
    await queryInterface.addIndex('student_profile_change_requests', ['user_id']);
    await queryInterface.addIndex('student_profile_change_requests', ['status']);

    await queryInterface.createTable('reference_document_views', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      reference_document_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      first_viewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_viewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      view_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      }
    });
    await queryInterface.addIndex('reference_document_views', ['user_id']);
    await queryInterface.addConstraint('reference_document_views', {
      fields: ['user_id', 'reference_document_id'],
      type: 'unique',
      name: 'reference_doc_view_user_doc_unique'
    });

    await queryInterface.createTable('beginner_scenario_sessions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      duration_seconds: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      documents_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      }
    });
    await queryInterface.addIndex('beginner_scenario_sessions', ['user_id']);
    await queryInterface.addIndex('beginner_scenario_sessions', ['started_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('beginner_scenario_sessions');
    await queryInterface.dropTable('reference_document_views');
    await queryInterface.dropTable('student_profile_change_requests');
    await queryInterface.dropTable('student_profiles');
  }
};
