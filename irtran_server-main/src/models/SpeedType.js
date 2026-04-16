const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const SpeedType = sequelize.define('SpeedType', {
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
    }
  }, {
    tableName: 'speed_types'
  }
);

module.exports = SpeedType;
