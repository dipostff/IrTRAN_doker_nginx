'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const DataTypes = Sequelize.DataTypes || Sequelize;
    await queryInterface.addColumn(
      'questions',
      'image_path',
      {
        type: DataTypes.STRING(500),
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('questions', 'image_path');
  }
};
