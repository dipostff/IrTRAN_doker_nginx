'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn('notifications', 'external_key', {
      type: DataTypes.STRING(191),
      allowNull: true
    });

    await queryInterface.addIndex('notifications', ['user_id', 'external_key'], {
      name: 'notifications_user_external_key_unique',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('notifications', 'notifications_user_external_key_unique');
    await queryInterface.removeColumn('notifications', 'external_key');
  }
};
