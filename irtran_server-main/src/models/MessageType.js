const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const MessageType = sequelize.define('MessageType', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255)
  },
  code: {
    type: DataTypes.INTEGER.UNSIGNED
  },
}, {
  tableName: 'message_types'
});

module.exports = MessageType;