const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const DocumentReviewTemplate = sequelize.define('DocumentReviewTemplate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  document_type: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false
  },
  updated_by_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'document_review_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false
});

module.exports = DocumentReviewTemplate;
