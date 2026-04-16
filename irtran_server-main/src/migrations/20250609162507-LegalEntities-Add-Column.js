'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.addColumn(
      'legal_entities',       // имя таблицы
      'id_business',        // имя новой колонки
      {             // параметры колонки
        type: DataTypes.INTEGER.UNSIGNED,
      }
    );

    await queryInterface.addColumn(
      'legal_entities',       // имя таблицы
      'id_holding',        // имя новой колонки
      {             // параметры колонки
        type: DataTypes.INTEGER.UNSIGNED,
      }
    );

    await queryInterface.addColumn(
      'legal_entities',       // имя таблицы
      'name_holding',        // имя новой колонки
      {             // параметры колонки
        type: DataTypes.STRING(255),
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('legal_entities', 'id_business');
    await queryInterface.removeColumn('legal_entities', 'id_holding');
    await queryInterface.removeColumn('legal_entities', 'name_holding');
  }
};