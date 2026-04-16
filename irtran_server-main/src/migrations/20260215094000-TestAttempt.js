'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('test_attempts', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      test_id: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      user_id: {
        type: DataTypes.STRING(255)
      },
      username: {
        type: DataTypes.STRING(255)
      },
      correct_answers: {
        type: DataTypes.INTEGER
      },
      question_count: {
        type: DataTypes.INTEGER
      },
      percent: {
        type: DataTypes.DECIMAL(5, 2)
      },
      created_at: {
        type: DataTypes.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_attempts');
  }
};

