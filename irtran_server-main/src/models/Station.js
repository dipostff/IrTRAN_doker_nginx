const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Station = sequelize.define('Station', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
    short_name: {
      type: DataTypes.STRING(255)
    },
    code: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    railway: {
      type: DataTypes.STRING(255)
    },
    paragraph: {
      type: DataTypes.STRING(255)
    },
    knot: {
      type: DataTypes.STRING(255)
    },
  }, {
    tableName: 'stations'
  }
);

module.exports = Station;
