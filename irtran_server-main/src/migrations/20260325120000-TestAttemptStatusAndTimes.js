'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn('test_attempts', 'status', {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'finished'
    });

    await queryInterface.addColumn('test_attempts', 'started_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('test_attempts', 'finished_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('test_attempts', 'finished_at');
    await queryInterface.removeColumn('test_attempts', 'started_at');
    await queryInterface.removeColumn('test_attempts', 'status');
  }
};

