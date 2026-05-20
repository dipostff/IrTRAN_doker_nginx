'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE message_types SET name = 'Смешанное', updated_at = NOW() WHERE name = 'Прямое смешанное'"
    );
    await queryInterface.sequelize.query(
      "UPDATE message_types SET name = 'Экспорт', updated_at = NOW() WHERE name = 'Местное смешанное'"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE message_types SET name = 'Прямое смешанное', updated_at = NOW() WHERE name = 'Смешанное'"
    );
    await queryInterface.sequelize.query(
      "UPDATE message_types SET name = 'Местное смешанное', updated_at = NOW() WHERE name = 'Экспорт'"
    );
  },
};
