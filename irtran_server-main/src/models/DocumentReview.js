const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const DocumentReview = sequelize.define('DocumentReview', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  document_source: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  document_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  document_type: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  student_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  version_no: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'submitted'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewed_by_teacher_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  check_mode: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  algorithm_summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  algorithm_recommendation: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  grade: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  acceptance: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  teacher_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  can_rework: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  payload_snapshot: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'document_reviews',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false
});

module.exports = DocumentReview;
