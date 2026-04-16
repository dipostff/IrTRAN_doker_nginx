const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const ReferenceDocumentView = sequelize.define(
  'ReferenceDocumentView',
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
    reference_document_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    first_viewed_at: DataTypes.DATE,
    last_viewed_at: DataTypes.DATE,
    view_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 1
    }
  },
  {
    tableName: 'reference_document_views',
    timestamps: false
  }
);

module.exports = ReferenceDocumentView;
