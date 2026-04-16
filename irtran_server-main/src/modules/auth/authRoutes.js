//-----------Подключаемые модули-----------//
const express = require('express');
const keycloakAuth = require('./keycloakAuth');
const { addRealmRoleToUser } = require('./keycloakAdmin');
//-----------Подключаемые модули-----------//

/**
 * Регистрация дополнительных маршрутов аутентификации/ролей на основном Express‑приложении.
 */
function registerAuthRoutes(app) {
  const router = express.Router();

  /**
   * POST /auth/upgrade-to-teacher
   *
   * Повысить роль текущего пользователя до teacher по специальному коду.
   * Требуется:
   *  - валидный access token Keycloak (middleware verifyToken)
   *  - корректный код в теле запроса: { "code": "..." }
   *  - переменная окружения TEACHER_UPGRADE_CODE на бэкенде
   */
  router.post(
    '/auth/upgrade-to-teacher',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const expectedCode = process.env.TEACHER_UPGRADE_CODE;

        if (!expectedCode) {
          return res.status(500).json({
            error: 'teacher_upgrade_not_configured',
            message:
              'Код преподавателя не настроен на сервере. Обратитесь к администратору.'
          });
        }

        const { code } = req.body || {};

        if (!code || code !== expectedCode) {
          return res.status(403).json({
            error: 'invalid_code',
            message: 'Неверный код преподавателя.'
          });
        }

        const user = req.user || {};
        const userId = user.sub || user.userId || user.id;

        if (!userId) {
          return res.status(400).json({
            error: 'user_id_not_found',
            message: 'Не удалось определить пользователя из токена.'
          });
        }

        const currentRoles =
          (user.realm_access && user.realm_access.roles) || [];

        if (currentRoles.includes('teacher')) {
          return res.status(200).json({
            status: 'already_teacher',
            message: 'У пользователя уже есть роль преподавателя.'
          });
        }

        await addRealmRoleToUser(userId, 'teacher');

        return res.status(200).json({
          status: 'upgraded',
          message:
            'Роль пользователя успешно повышена до преподавателя. Изменения вступят в силу при следующем обновлении токена.'
        });
      } catch (error) {
        console.error(
          'Error upgrading user to teacher:',
          error.response && error.response.data
            ? error.response.data
            : error.message || error
        );

        return res.status(500).json({
          error: 'upgrade_failed',
          message: 'Не удалось повысить роль пользователя до преподавателя.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerAuthRoutes
};
//-----------Экспортируемые модули-----------//

