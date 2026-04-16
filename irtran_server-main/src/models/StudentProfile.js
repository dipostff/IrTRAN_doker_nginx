const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const StudentProfile = sequelize.define(
  'StudentProfile',
  {
    user_id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    phone: DataTypes.STRING(64),
    patronymic: DataTypes.STRING(255),
    academic_group: DataTypes.STRING(255),
    student_book_id: DataTypes.STRING(128),
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE
  },
  {
    tableName: 'student_profiles',
    timestamps: false
  }
);

module.exports = StudentProfile;
