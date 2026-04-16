'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'requests_transportation',
      'user_id',
      { type: Sequelize.STRING(255), allowNull: true }
    );
    await queryInterface.addColumn(
      'requests_transportation',
      'deleted_at',
      { type: Sequelize.DATE, allowNull: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('requests_transportation', 'user_id');
    await queryInterface.removeColumn('requests_transportation', 'deleted_at');
  }
};
