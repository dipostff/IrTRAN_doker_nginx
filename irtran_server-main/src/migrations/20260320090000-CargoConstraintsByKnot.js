'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('knot_cargo_groups', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      knot_key: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      id_cargo_group: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'cargo_groups', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    // Уникальность пары (knot_key, id_cargo_group), чтобы не было дублей
    await queryInterface.addConstraint('knot_cargo_groups', {
      fields: ['knot_key', 'id_cargo_group'],
      type: 'unique',
      name: 'uq_knot_cargo_groups'
    });

    await queryInterface.addIndex('knot_cargo_groups', ['knot_key']);

    await queryInterface.createTable('knot_cargos', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      knot_key: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      id_cargo: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'cargo', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    });

    // Уникальность пары (knot_key, id_cargo), чтобы не было дублей
    await queryInterface.addConstraint('knot_cargos', {
      fields: ['knot_key', 'id_cargo'],
      type: 'unique',
      name: 'uq_knot_cargos'
    });

    await queryInterface.addIndex('knot_cargos', ['knot_key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('knot_cargo_groups');
    await queryInterface.dropTable('knot_cargos');
  }
};

