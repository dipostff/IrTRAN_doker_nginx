//-----------Подключаемые модули-----------//
const config_restapi = require('./../../../config/restapi.json');
const Handler = require(`./../../..` + `${config_restapi.path_handler}` + `Handler`);
//-----------Подключаемые модули-----------//

/**
 * Класс, который отвечает за дочерние процессы-работники(воркеры), который работают
 * параллельно с родительским процессом.
 */
class Worker {

  /** Конструктор класса */
  constructor() {
    /** Привязывание обработчика сообщений от родительского процесса к функции Handler */
    process.on('message', (message) => {
      this.HandlerMessage(JSON.parse(message));
    });
  }

  /**
   * Функция, которая является обработчиком сообщений в виде объекта от родительского процесса
   */
  async HandlerMessage(message) {
    let data = await Handler.Route(message);
    this.Send(data);
  }

  /**
   * Функция, которая отправляет сообщение в видео объекта родительскому классу
   */
  Send(message) {
    process.send(JSON.stringify(message));
  }
}

new Worker();

//-----------Экспортируемые модули-----------//
module.exports = Worker;
//-----------Экспортируемые модули-----------//