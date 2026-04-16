const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');

const Question = sequelize.define(
  'Question',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      // Внутренний идентификатор/имя вопроса (используется как name в SurveyJS)
      type: DataTypes.STRING(100)
    },
    text: {
      type: DataTypes.TEXT
    },
    type: {
      // Тип вопроса (radiogroup, checkbox, text и т.п. для SurveyJS)
      type: DataTypes.STRING(50)
    },
    options: {
      // Варианты ответов (JSON-массив)
      type: DataTypes.JSON
    },
    correct_answer: {
      // Правильный ответ (или массив ответов) в формате, совместимом с SurveyJS
      type: DataTypes.JSON
    },
    difficulty: {
      type: DataTypes.STRING(50)
    },
    tags: {
      type: DataTypes.STRING(255)
    },
    image_path: {
      type: DataTypes.STRING(500)
    },
    created_by_user_id: {
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
    tableName: 'questions'
  }
);

module.exports = Question;

