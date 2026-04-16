const { Sequelize } = require('sequelize');
const dbConfig = require('./../../../config/databases.json');

// Выбираем конфиг в зависимости от окружения
const env = process.env.NODE_ENV || 'development';
const fileConfig = dbConfig[env];

// Переменные окружения (Docker) имеют приоритет над файлом
const config = process.env.DATABASE_HOST
  ? {
      database: process.env.DATABASE_NAME || fileConfig.database,
      username: process.env.DATABASE_USER || fileConfig.username,
      password: process.env.DATABASE_PASSWORD || fileConfig.password,
      host: process.env.DATABASE_HOST,
      dialect: process.env.DATABASE_DIALECT || fileConfig.dialect || 'mysql',
      logging: fileConfig.logging
    }
  : fileConfig;

// Создаём экземпляр Sequelize
const {
  database,
  username,
  password,
  ...restConfig
} = config;

const sequelize = new Sequelize(database, username, password, {
  ...restConfig,
  define: {
    ...(restConfig.define || {}),
    timestamps: false
  }
});

module.exports = sequelize;