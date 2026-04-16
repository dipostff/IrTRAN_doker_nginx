const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const DocumentType = sequelize.define('DocumentType', {
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
    tableName: 'document_types'
  }
);

module.exports = DocumentType;
