'use strict';

// Конфиг для sequelize-cli (миграции). Для Docker MySQL по умолчанию пароль root (MYSQL_ROOT_PASSWORD).
const fileConfig = require('./databases.json');

const defaultPassword = process.env.DATABASE_PASSWORD ?? process.env.MYSQL_ROOT_PASSWORD ?? 'root';

function fromEnv(database) {
  return {
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || defaultPassword,
    database: process.env.DATABASE_NAME || database,
    host: process.env.DATABASE_HOST || 'localhost',
    dialect: process.env.DATABASE_DIALECT || 'mysql',
    logging: false
  };
}

// development: при наличии DATABASE_HOST используем fromEnv, иначе fileConfig с подстановкой пароля
const development = process.env.DATABASE_HOST
  ? fromEnv('irtran')
  : { ...fileConfig.development, password: fileConfig.development.password || defaultPassword };

module.exports = {
  development,
  test: process.env.DATABASE_HOST ? fromEnv('irtran_test') : { ...fileConfig.test, password: fileConfig.test.password || defaultPassword },
  production: process.env.DATABASE_HOST ? fromEnv('irtran') : fileConfig.production,
  mysql: fileConfig.mysql
};
