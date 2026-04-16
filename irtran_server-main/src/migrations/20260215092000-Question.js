'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('questions', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(100)
      },
      text: {
        type: DataTypes.TEXT
      },
      type: {
        type: DataTypes.STRING(50)
      },
      options: {
        type: DataTypes.JSON
      },
      correct_answer: {
        type: DataTypes.JSON
      },
      difficulty: {
        type: DataTypes.STRING(50)
      },
      tags: {
        type: DataTypes.STRING(255)
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('questions');
  }
};

