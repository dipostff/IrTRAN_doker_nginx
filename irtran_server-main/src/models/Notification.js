const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'info'
    },
    link: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    deadline_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by_user_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    external_key: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE
    },
    updated_at: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: 'notifications',
    timestamps: false
  }
);

module.exports = Notification;
