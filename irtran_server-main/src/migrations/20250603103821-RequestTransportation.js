'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.createTable('requests_transportation', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      id_document_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      registration_date: {
        type: DataTypes.DATE
      },
      transportation_date_from: {
        type: DataTypes.DATE
      },
      transportation_date_to: {
        type: DataTypes.DATE
      },
      id_message_type: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_sign_sending: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_country_departure: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_country_departure_point: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_shipper: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_departure_station: {
        type: DataTypes.BOOLEAN
      },
      addr: {
        type: DataTypes.STRING(255)
      },
      id_carriage_ownership: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_loading_organizer: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_common_areas: {
        type: DataTypes.BOOLEAN
      },
      contract_number: {
        type: DataTypes.STRING(255)
      },
      id_owner_non_public_railway: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_approval_with_owner: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      approval_with_owner_date: {
        type: DataTypes.DATE
      },
      id_cargo_group: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      id_method_submission: {
        type: DataTypes.INTEGER.UNSIGNED
      },
      is_form_3: {
        type: DataTypes.BOOLEAN
      },
      description: {
        type: DataTypes.STRING(4095)
      },
      is_transmitted_by_fax: {
        type: DataTypes.BOOLEAN
      },
      created_at: { 
        type: DataTypes.DATE 
      },
      updated_at: { 
        type: DataTypes.DATE 
      },
      document_status: {
          type: DataTypes.INTEGER.UNSIGNED
      },
      id_station_departure: {
          type: DataTypes.INTEGER.UNSIGNED
      },
      is_owner_approval: {
          type: DataTypes.BOOLEAN
      },
      owner_approval_date: {
          type: DataTypes.DATE
      },
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_document_type'],
      type: 'foreign key',
      name: 'fk_id_document_type',
      references: {
        table: 'document_types',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_message_type'],
      type: 'foreign key',
      name: 'fk_id_message_type',
      references: {
        table: 'message_types',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_sign_sending'],
      type: 'foreign key',
      name: 'fk_id_sign_sending',
      references: {
        table: 'signs_sending',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_country_departure'],
      type: 'foreign key',
      name: 'fk_id_country_departure',
      references: {
        table: 'countries',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_country_departure_point'],
      type: 'foreign key',
      name: 'fk_id_country_departure_point',
      references: {
        table: 'countries',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_shipper'],
      type: 'foreign key',
      name: 'fk_id_shipper',
      references: {
        table: 'legal_entities',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_carriage_ownership'],
      type: 'foreign key',
      name: 'fk_id_carriage_ownership',
      references: {
        table: 'ownerships',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_loading_organizer'],
      type: 'foreign key',
      name: 'fk_id_loading_organizer',
      references: {
        table: 'legal_entities',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_owner_non_public_railway'],
      type: 'foreign key',
      name: 'fk_id_owner_non_public_railway',
      references: {
        table: 'owners_non_public_railway',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_approval_with_owner'],
      type: 'foreign key',
      name: 'fk_id_approval_with_owner',
      references: {
        table: 'approvals_with_owner',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_cargo_group'],
      type: 'foreign key',
      name: 'fk_id_cargo_group',
      references: {
        table: 'cargo_groups',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_method_submission'],
      type: 'foreign key',
      name: 'fk_id_method_submission',
      references: {
        table: 'methods_submission',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('requests_transportation', {
      fields: ['id_station_departure'],
      type: 'foreign key',
      name: 'fk_id_station_departure',
      references: {
        table: 'stations',
        field: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('requests_transportation');
  }
};
