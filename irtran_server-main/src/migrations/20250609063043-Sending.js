'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('sending', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      id_cargo: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_transport_package_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_train_formation: {
        type: DataTypes.BOOLEAN
      },
      id_send_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_rolling_stock_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_speed_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_owner_wagon: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      weight: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      count_wagon: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_country_destination: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_station_destination: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_station_out: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_transshipment_point: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_organization_TP: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_alternative_route: {
        type: DataTypes.BOOLEAN
      },
      id_receiver: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_among_as: {
        type: DataTypes.BOOLEAN
      },
      OKPO: {
        type: DataTypes.STRING(255)
      },
      name: {
        type: DataTypes.STRING(255)
      },
      addr: {
        type: DataTypes.STRING(255)
      },
      code_exclusive_tariff: {
        type: DataTypes.STRING(255)
      },
      description: {
        type: DataTypes.STRING(4095)
      },
      id_contract_special_terms: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    // Список внешних ключей
    const foreignKeys = [
      { field: 'id_cargo', table: 'cargo', name: 'fk_sending_cargo' },
      { field: 'id_transport_package_type', table: 'transport_package_types', name: 'fk_sending_transport_package_type' },
      { field: 'id_send_type', table: 'send_types', name: 'fk_sending_send_type' },
      { field: 'id_rolling_stock_type', table: 'rolling_stock_types', name: 'fk_sending_rolling_stock_type' },
      { field: 'id_speed_type', table: 'speed_types', name: 'fk_sending_speed_type' },
      { field: 'id_owner_wagon', table: 'legal_entities', name: 'fk_sending_owner_wagon' },
      { field: 'id_country_destination', table: 'countries', name: 'fk_sending_country_destination' },
      { field: 'id_station_destination', table: 'stations', name: 'fk_sending_station_destination' },
      { field: 'id_station_out', table: 'stations', name: 'fk_sending_station_out' },
      { field: 'id_transshipment_point', table: 'stations', name: 'fk_sending_transshipment_point' },
      { field: 'id_organization_TP', table: 'legal_entities', name: 'fk_sending_organization_TP' },
      { field: 'id_receiver', table: 'legal_entities', name: 'fk_sending_receiver' },
      { field: 'id_contract_special_terms', table: 'contracts', name: 'fk_sending_contract_special_terms' }
    ];

    // Добавляем все внешние ключи
    for (const fk of foreignKeys) {
      await queryInterface.addConstraint('sending', {
        fields: [fk.field],
        type: 'foreign key',
        name: fk.name,
        references: {
          table: fk.table,
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    // Удаляем все внешние ключи
    const foreignKeys = [
      'fk_sending_cargo',
      'fk_sending_transport_package_type',
      'fk_sending_send_type',
      'fk_sending_rolling_stock_type',
      'fk_sending_speed_type',
      'fk_sending_owner_wagon',
      'fk_sending_country_destination',
      'fk_sending_station_destination',
      'fk_sending_station_out',
      'fk_sending_transshipment_point',
      'fk_sending_organization_TP',
      'fk_sending_receiver',
      'fk_sending_contract_special_terms'
    ];

    for (const fkName of foreignKeys) {
      await queryInterface.removeConstraint('sending', fkName);
    }

    await queryInterface.dropTable('sending');
  }
};