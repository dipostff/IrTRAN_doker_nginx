//-----------Подключаемые модули-----------//
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const keycloakAuth = require('./../auth/keycloakAuth');
const Scenario = require('./../../models/Scenario');
const ScenarioView = require('./../../models/ScenarioView');
//-----------Подключаемые модули-----------//

const scenariosUploadDir =
  process.env.SCENARIOS_UPLOAD_DIR ||
  path.join(__dirname, '../../../uploads/scenarios');

if (!fs.existsSync(scenariosUploadDir)) {
  fs.mkdirSync(scenariosUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, scenariosUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 МБ на сценарий
  }
});

/**
 * Регистрация маршрутов для работы со сценариями обучения.
 *
 * Правила доступа:
 *  - Создание/редактирование сценариев: роли teacher или app-admin.
 *  - Просмотр/скачивание сценариев: любой авторизованный пользователь.
 */
function registerScenarioRoutes(app) {
  const router = express.Router();

  // Создание сценария (только teacher / app-admin)
  router.post(
    '/api/scenarios',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    upload.single('file'),
    async (req, res) => {
      try {
        const { title, description } = req.body || {};
        const file = req.file;

        if (!title || !title.trim()) {
          return res.status(400).json({
            error: 'title_required',
            message: 'Необходимо указать название сценария.'
          });
        }

        if (!file) {
          return res.status(400).json({
            error: 'file_required',
            message: 'Необходимо загрузить файл сценария.'
          });
        }

        const user = req.user || {};
        const createdBy = user.sub || null;
        const now = new Date();

        const scenario = await Scenario.create({
          title: title.trim(),
          description: description || '',
          storage_path: file.path,
          mime_type: file.mimetype,
          size: file.size,
          created_by_user_id: createdBy,
          created_at: now,
          updated_at: now
        });

        return res.status(201).json(scenario);
      } catch (error) {
        console.error('Error creating scenario:', error);
        return res.status(500).json({
          error: 'create_failed',
          message: 'Не удалось создать сценарий.'
        });
      }
    }
  );

  // Обновление названия/описания сценария (только teacher / app-admin)
  router.put(
    '/api/scenarios/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор сценария.'
          });
        }

        const { title, description } = req.body || {};
        const scenario = await Scenario.findByPk(id);

        if (!scenario) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Сценарий не найден.'
          });
        }

        if (title && title.trim()) {
          scenario.title = title.trim();
        }
        if (description !== undefined) {
          scenario.description = description;
        }
        scenario.updated_at = new Date();

        await scenario.save();

        return res.json(scenario);
      } catch (error) {
        console.error('Error updating scenario:', error);
        return res.status(500).json({
          error: 'update_failed',
          message: 'Не удалось обновить сценарий.'
        });
      }
    }
  );

  // Получение списка сценариев (все авторизованные)
  router.get(
    '/api/scenarios',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const q = (req.query.q || '').trim();
        const limit = Math.min(
          parseInt(req.query.limit, 10) || 50,
          100
        );
        const offset = parseInt(req.query.offset, 10) || 0;

        const where = {};

        if (q) {
          where[Op.or] = [
            { title: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } }
          ];
        }

        const { rows, count } = await Scenario.findAndCountAll({
          where,
          limit,
          offset,
          order: [['created_at', 'DESC']]
        });

        return res.json({
          items: rows,
          total: count
        });
      } catch (error) {
        console.error('Error listing scenarios:', error);
        return res.status(500).json({
          error: 'list_failed',
          message: 'Не удалось загрузить список сценариев.'
        });
      }
    }
  );

  // Скачивание файла сценария (все авторизованные)
  router.get(
    '/api/scenarios/:id/file',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор сценария.'
          });
        }

        const scenario = await Scenario.findByPk(id);
        if (!scenario) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Сценарий не найден.'
          });
        }

        if (
          !scenario.storage_path ||
          !fs.existsSync(scenario.storage_path)
        ) {
          return res.status(410).json({
            error: 'file_not_found',
            message: 'Файл сценария не найден на сервере.'
          });
        }

        return res.download(scenario.storage_path, scenario.title || 'scenario');
      } catch (error) {
        console.error('Error downloading scenario file:', error);
        return res.status(500).json({
          error: 'download_failed',
          message: 'Не удалось скачать файл сценария.'
        });
      }
    }
  );

  // Фиксация ознакомления со сценарием (для панели преподавателя)
  router.post(
    '/api/scenarios/:id/view',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор сценария.'
          });
        }

        const scenario = await Scenario.findByPk(id);
        if (!scenario) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Сценарий не найден.'
          });
        }

        const user = req.user || {};
        const userId = user.sub || null;
        const username = user.preferred_username || user.username || null;
        const now = new Date();

        let view = await ScenarioView.findOne({
          where: {
            scenario_id: id,
            user_id: userId
          }
        });

        if (view) {
          view.last_viewed_at = now;
          view.completed = true;
          await view.save();
        } else {
          await ScenarioView.create({
            scenario_id: id,
            user_id: userId,
            username,
            first_viewed_at: now,
            last_viewed_at: now,
            completed: true
          });
        }

        return res.status(201).json({ status: 'ok' });
      } catch (error) {
        console.error('Error recording scenario view:', error);
        return res.status(500).json({
          error: 'view_failed',
          message: 'Не удалось зафиксировать просмотр сценария.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerScenarioRoutes
};
//-----------Экспортируемые модули-----------//

