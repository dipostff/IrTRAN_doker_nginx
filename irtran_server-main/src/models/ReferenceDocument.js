const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const ReferenceDocument = sequelize.define(
  'ReferenceDocument',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255)
    },
    filename: {
      type: DataTypes.STRING(255)
    },
    storage_path: {
      type: DataTypes.STRING(512)
    },
    mime_type: {
      type: DataTypes.STRING(128)
    },
    size: {
      type: DataTypes.BIGINT
    },
    text_content: {
      // LONGTEXT для полнотекстового поиска по содержимому
      type: DataTypes.TEXT('long')
    },
    created_by_user_id: {
      // sub из токена Keycloak
      type: DataTypes.STRING(255)
    },
    created_at: {
      type: DataTypes.DATE
    },
    updated_at: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: 'reference_documents'
  }
);

module.exports = ReferenceDocument;

