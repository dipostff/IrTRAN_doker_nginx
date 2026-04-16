//-----------Подключаемые модули-----------//
const mysql = require('mysql2');
const config_databases = require('./../../../config/databases.json');
//-----------Подключаемые модули-----------//

// Для Docker: mysql.irtran из env или из файла
function getMysqlDatabases() {
  if (process.env.DATABASE_HOST) {
    const dbName = process.env.DATABASE_NAME || (config_databases.development && config_databases.development.database) || 'irtran';
    return {
      [dbName]: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || ''
      }
    };
  }
  return config_databases.mysql || {};
}

/**
 * Класс для работы с базой данных Mysql
 */
class Mysql {
    static databases = getMysqlDatabases();

    /** 
     * Асинхронная функция, которая отправляет SQL команду в mysql по данным из переменной connection
     */
    static async Request(database, command) {
        let connection = await this.NewConnection(database);
        let result = "null";
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

        connection.connect();
        connection.query(command, function (error, results, fields) {
            if (error) {
                console.log(error);
                result = "Error request";
            } else {
            result = results;
            }
        });
        connection.end();

        while (result == "null") {
            await delay(5);
        }

        return result;
    }

    /**
     * Функция, которая создаёт переменную, через которую мы общаемся с базой данных
     */
    static async NewConnection(database) {
        /** Переменная, через которую мы общаемся с базой данных */
        let connection = mysql.createConnection({
            database: database,
            host: this.databases[database].host,
            user: this.databases[database].user,
            password: this.databases[database].password,
        });
        return connection;
    }
}

//-----------Экспортируемые модули-----------//
module.exports = Mysql;
//-----------Экспортируемые модули-----------//