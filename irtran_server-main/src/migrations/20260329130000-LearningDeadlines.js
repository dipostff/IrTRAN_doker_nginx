'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('learning_deadlines', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      entity_type: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      entity_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      deadline_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      assigned_by_user_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('learning_deadlines', ['user_id']);
    await queryInterface.addIndex('learning_deadlines', ['deadline_at']);
    await queryInterface.addIndex('learning_deadlines', ['entity_type', 'entity_id']);
    await queryInterface.addConstraint('learning_deadlines', {
      fields: ['user_id', 'entity_type', 'entity_id'],
      type: 'unique',
      name: 'learning_deadlines_user_entity_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('learning_deadlines');
  }
};
