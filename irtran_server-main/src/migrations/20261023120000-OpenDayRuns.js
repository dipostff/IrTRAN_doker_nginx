'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('open_day_runs', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      client_run_id: {
        type: DataTypes.STRING(36),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'started'
      },
      top: {
        type: DataTypes.STRING(8),
        allowNull: true
      },
      second: {
        type: DataTypes.STRING(8),
        allowNull: true
      },
      low: {
        type: DataTypes.STRING(8),
        allowNull: true
      },
      is_close: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      percent_pi: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true
      },
      percent_is: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true
      },
      percent_bas: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true
      },
      percent_bi: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true
      },
      question_ids: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      duration_sec: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      finished_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('open_day_runs', ['client_run_id'], {
      unique: true,
      name: 'open_day_runs_client_run_id_uq'
    });
    await queryInterface.addIndex('open_day_runs', ['status']);
    await queryInterface.addIndex('open_day_runs', ['started_at']);
    await queryInterface.addIndex('open_day_runs', ['finished_at']);
    await queryInterface.addIndex('open_day_runs', ['top']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('open_day_runs');
  }
};
