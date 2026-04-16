//-----------Подключаемые модули-----------//
const { fork } = require('child_process');
const EventEmitter = require('events');
//-----------Подключаемые модули-----------//

/**
 * Класс, который регулирует работу дочерних процессов-работников
 */
class WorkerController {
  /** Массив дочерних процессов-работников */
  static workers = [];
  /** Массив, в котором находится очередь кодов запросов на обработку, ожидающих, пока освободится какой-нибудь дочерний процесс-работник */
  static queue_request = [];
  /** Объект для работы с событиями */
  static events = new EventEmitter();
  /** Переменная, нужна для создания уникального id */
  static id_unique = 0;

  /**
   * Статическая функция, которая ищет свободный дочерний процесс-работник, если находит
   * то возвращает его индекс, если нет, то возвращает случайное значение
   */
  static SearchFreeWorker() {
    for(let i = 0; i < WorkerController.workers.length; i++) {
      if(WorkerController.workers[i].status === "free") {
        console.log(`Запущен воркер под номером ${i}`);
        return i;
      }
    }
    return -1;
  }

  /**
   * Функция, которая отправляет сообщение message свободному дочернему процессу-работнику,
   * если свободного дочернего процесса-работника нет, то возвращает "All workers are busy"
   */
  static async Send(message) {
    let return_message = null;
    let worker_index = WorkerController.SearchFreeWorker();
    if (worker_index >= 0) {
      let promise = new Promise((resolve, reject) => {
        WorkerController.workers[worker_index].on('message', function result(message) {
          WorkerController.workers[worker_index].status = "free";
          if(WorkerController.queue_request.length > 0) {
            WorkerController.events.emit(`worker free ${WorkerController.queue_request[0]}`);
            WorkerController.queue_request.shift();
          }
          WorkerController.workers[worker_index].off('message', result);
          resolve(message);
        });
        WorkerController.workers[worker_index].status = "processes";
        WorkerController.workers[worker_index].send(JSON.stringify(message));
      });
      await promise.then(result => {
          return_message = result;
        },
        error => {
          console.log("Rejected: " + error);
        }
      );
    } else {
      let promise = new Promise((resolve, reject) => {
        let id_promise = WorkerController.GenerateId();
        WorkerController.queue_request.push(id_promise);
        WorkerController.events.on(`worker free ${id_promise}`, function expect() {
          WorkerController.events.off(`worker free ${id_promise}`, expect);
          console.log(`Запрос из очереди начал выполнение...`);
          resolve(WorkerController.Send(message));
        });
      });
      await promise.then(result => {
          return_message = result;
        },
        error => {
          console.log("Rejected: " + error);
        }
      );
    }
    return return_message;
  }

  /**
   * Функция, которая принимает данные запроса,
   * отдаёт его на обработку свободному дочернему процессу-работнику,
   * а после отправляет результат клиенту.
   */
  static async HandleRequest(req, res) {
    req.query.body = req.body;
    let result = await WorkerController.Send(req.query);
    res.send(result);
  }

  /**
   * Функция, которая создаёт дочерние процессы-работники
   */
  static CreateWorkers(workers_count, workers_memory_size) {
    for(let i = 0; i < workers_count; i++) {
      WorkerController.workers.push(fork(__dirname + '/Worker', { execArgv: [`--max-old-space-size=${workers_memory_size}`]} ));
      WorkerController.workers[i].status = "free";
    }
  }

  /**
   * Функция, которая генерирует уникальный id и возвращает его
   */
  static GenerateId() {
    WorkerController.id_unique++;
    return WorkerController.id_unique;
  }
}

//-----------Экспортируемые модули-----------//
module.exports = WorkerController;
//-----------Экспортируемые модули-----------//