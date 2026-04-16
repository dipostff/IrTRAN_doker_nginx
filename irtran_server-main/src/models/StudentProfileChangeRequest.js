const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const StudentProfileChangeRequest = sequelize.define(
  'StudentProfileChangeRequest',
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
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending'
    },
    review_comment: DataTypes.TEXT,
    reviewer_user_id: DataTypes.STRING(255),
    created_at: DataTypes.DATE,
    reviewed_at: DataTypes.DATE
  },
  {
    tableName: 'student_profile_change_requests',
    timestamps: false
  }
);

module.exports = StudentProfileChangeRequest;
