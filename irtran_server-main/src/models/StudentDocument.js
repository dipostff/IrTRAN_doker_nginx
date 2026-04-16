const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const StudentDocument = sequelize.define('StudentDocument', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  document_type: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_exemplar: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  exemplar_title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reference_exemplar_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true
  }
}, {
  tableName: 'student_documents',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false
});

module.exports = StudentDocument;
