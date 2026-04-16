//-----------Подключаемые модули-----------//
const express = require('express');
const config_app = require('./../../../config/app.json');
const config_worker = require('./../../../config/worker.json');
const fs = require('fs');
const https = require('https');
const http = require('http');
const Get = require('./../HTTP/Get');
const Post = require('./../HTTP/Post');
const WorkerController = require('./../worker/WorkerController');
const { registerAuthRoutes } = require('./../auth/authRoutes');
const { registerReferenceRoutes } = require('./../content/referenceRoutes');
const { registerDictionaryRoutes } = require('./../dictionaries/dictionaryRoutes');
const { registerCargoConstraintsRoutes } = require('./../dictionaries/cargoConstraintsRoutes');
const { registerScenarioRoutes } = require('./../content/scenarioRoutes');
const { registerTestRoutes } = require('./../tests/testRoutes');
const { registerAdminRoutes } = require('./../admin/adminRoutes');
const { registerTeacherRoutes } = require('./../teacher/teacherRoutes');
const { registerDocumentsRoutes } = require('./../documents/documentsRoutes');
const { registerBugReportsRoutes } = require('./../bugReports/bugReportsRoutes');
const { registerStudentRoutes } = require('./../student/studentRoutes');
const { registerNotificationsRoutes } = require('./../notifications/notificationsRoutes');
//-----------Подключаемые модули-----------//

/**
 * Класс, являющийся ядром сервера
 */
class Server {
  /** Объект для работы с сервером */
  app = express();
  /** dns-имя сервера */
  server_name;
  /** Порт, на котором открыто ядро */
  port;
  /** Фиксированное количество дочерних процессов-работников, должно быть не меньше 1 */
  workers_count;
  /** Фиксированное количество оперативной памяти в МБ, выделяемое на один дочерний процесс-работник */
  workers_memory_size;
  
  /** Конструктор класса */
  constructor() {
    this.server_name = process.env.SERVER_NAME || config_app.server_name;
    this.port = process.env.PORT || config_app.port;
    this.workers_count = config_worker.workers_count;
    this.workers_memory_size = config_worker.workers_memory_size;
    this.Run();
  }

  /**
   * Функция, которая запускает сервер
   */
  Run() {
    let start = new Date().getTime();
    console.log(`Начинаем запуск сервера ${this.server_name} ...`);
    
    //-------------------------------------------------------//
    this.StartListen();
    this.EvasionCORS();
    this.StartGet();
    this.StartPost();
    this.RegisterCustomRoutes();
    this.CreateWorkers();
    //-------------------------------------------------------//

    let finish = new Date().getTime();
    console.log(`Сервер запущен. Время запуска {${(finish-start)/1000}} секунды.`);
  }

  /**
   * Функция, которая запускает прослушивание сервера на указаном порту
   */
  StartListen() {
    if (config_app.use_https) {
    const options = {
      cert: fs.readFileSync(`/etc/letsencrypt/live/${this.server_name}/cert.pem`),
      key: fs.readFileSync(`/etc/letsencrypt/live/${this.server_name}/privkey.pem`)
    };
    https.createServer(options, this.app).listen(this.port);
      console.log(`HTTPS сервер прослушивается на порту {${this.port}}.`);
    } else {
      http.createServer(this.app).listen(this.port);
      console.log(`HTTP сервер прослушивается на порту {${this.port}}.`);
    }
    //-------------------------------------------------------//
  }
  
  /**
   * Функция, которая запускает обработчик Get запросов к серверу
   */
  StartGet() {
    new Get(this.app);
    //-------------------------------------------------------//

    console.log(`Обработчики Get запросов запущены.`);
  }

  /**
   * Функция, которая запускает обработчик Post запросов к серверу
   */
  StartPost() {
    new Post(this.app);
    //-------------------------------------------------------//

    console.log(`Обработчики Post запросов запущены.`);
  }

  /**
   * Функция, которая создаёт дочерние процессы-работники
   */
  CreateWorkers() {
    WorkerController.CreateWorkers(this.workers_count, this.workers_memory_size);
    //-------------------------------------------------------//

    console.log(`Создано {${this.workers_count}} дочерних процессов-работников.`);
    console.log(`На каждый дочерний процесс-работник выделено {${this.workers_memory_size}} MB памяти.`);
  }

  /**
   * Функция, которая регистрирует дополнительные (кастомные) маршруты,
   * не обрабатываемые worker-процессами (например, сервисные Auth‑эндпоинты).
   */
  RegisterCustomRoutes() {
    registerAuthRoutes(this.app);
    registerReferenceRoutes(this.app);
    registerDictionaryRoutes(this.app);
    registerCargoConstraintsRoutes(this.app);
    registerScenarioRoutes(this.app);
    registerTestRoutes(this.app);
    registerAdminRoutes(this.app);
    registerTeacherRoutes(this.app);
    registerDocumentsRoutes(this.app);
    registerBugReportsRoutes(this.app);
    registerStudentRoutes(this.app);
    registerNotificationsRoutes(this.app);
  }

  /**
   * Функция, которая добавляет дополнительные параметры к возвращаемым запросам, чтобы обходить защиту CORS
   */
  EvasionCORS() {
    /** Функция, которая срабатывает при любых запросах, нужна для обхода защиты CORS */
    this.app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "*");
      res.header("Access-Control-Allow-Headers", "*");// X-Requested-With
      next();
    });
  }
}

//-----------Экспортируемые модули-----------//
module.exports = Server;
//-----------Экспортируемые модули-----------//