//-----------Подключаемые модули-----------//
const WorkerController = require('./../worker/WorkerController');
const config_restapi = require('./../../../config/restapi.json');
const config_app = require('./../../../config/app.json');
const keycloakAuth = require('./../auth/keycloakAuth');
//-----------Подключаемые модули-----------//

/**
 * Класс для работы с Get запросами к серверу
 */
class Get {
  /** Объект для работы с сервером */
  app;
  /** Массив обрабатываемых маршрутов */
  routes;

  /** Конструктор класса */
  constructor(app) {
    this.app = app;
    this.routes = config_restapi.GET;
    this.ListGet();
  }

  /**
   * Список всех обрабатываемых сервером Get запросов
   */
  ListGet() {
    // Применяем аутентификацию Keycloak ко всем маршрутам, если она включена
    const authMiddleware = config_app.enable_auth ? keycloakAuth.verifyToken() : (req, res, next) => next();
    
    for(let i = 0; i < this.routes.length; i++) {
      this.app.get(this.routes[i], authMiddleware, (req, res) => {
        req.query.type_request = `GET ${this.routes[i]}`;
        WorkerController.HandleRequest(req, res);
      });
    }
  }
}

//-----------Экспортируемые модули-----------//
module.exports = Get;
//-----------Экспортируемые модули-----------//










