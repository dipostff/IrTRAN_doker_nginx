'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('scenario_views', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      scenario_id: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      user_id: {
        type: DataTypes.STRING(255)
      },
      username: {
        type: DataTypes.STRING(255)
      },
      first_viewed_at: {
        type: DataTypes.DATE
      },
      last_viewed_at: {
        type: DataTypes.DATE
      },
      completed: {
        type: DataTypes.BOOLEAN
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('scenario_views');
  }
};

