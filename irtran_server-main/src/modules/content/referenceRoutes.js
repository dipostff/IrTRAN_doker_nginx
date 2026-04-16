//-----------Подключаемые модули-----------//
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const keycloakAuth = require('./../auth/keycloakAuth');
const ReferenceDocument = require('./../../models/ReferenceDocument');
const { extractTextFromFile } = require('./textExtractor');
//-----------Подключаемые модули-----------//

// Директория для хранения загружаемых файлов справочника
const referenceUploadDir =
  process.env.REFERENCE_UPLOAD_DIR ||
  path.join(__dirname, '../../../uploads/reference');

if (!fs.existsSync(referenceUploadDir)) {
  fs.mkdirSync(referenceUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, referenceUploadDir);
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
    fileSize: 25 * 1024 * 1024 // 25 МБ на один файл справочника
  },
  fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
      'application/vnd.ms-excel.template.macroEnabled.12'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const isWordExt = ext === '.doc' || ext === '.docx';
    const isPdfExt = ext === '.pdf';
    const isExcelExt =
      ext === '.xls' ||
      ext === '.xlsx' ||
      ext === '.xlsm' ||
      ext === '.xlsb' ||
      ext === '.xltx' ||
      ext === '.xltm';

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      isWordExt ||
      isPdfExt ||
      isExcelExt
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Недопустимый тип файла. Разрешены PDF, документы Word и файлы Excel (.xls, .xlsx, .xlsm, .xlsb, .xltx, .xltm).'
        )
      );
    }
  }
});

/**
 * Регистрация маршрутов для работы со справочником.
 *
 * Правила доступа:
 *  - Загрузка/создание справочных материалов: только роль app-admin.
 *  - Поиск и скачивание: любой авторизованный пользователь (student/teacher/app-admin).
 */
function registerReferenceRoutes(app) {
  const router = express.Router();

  // Создание нового справочного документа (только app-admin)
  router.post(
    '/api/reference',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    upload.single('file'),
    async (req, res) => {
      try {
        const { title } = req.body || {};
        const file = req.file;

        if (!file) {
          return res.status(400).json({
            error: 'file_required',
            message: 'Необходимо загрузить файл справочника.'
          });
        }

        if (!title) {
          return res.status(400).json({
            error: 'title_required',
            message: 'Необходимо указать название справочного материала.'
          });
        }

        let textContent = '';
        textContent = await extractTextFromFile(file.path, file.mimetype);

        const user = req.user || {};
        const createdBy = user.sub || null;
        const now = new Date();

        const doc = await ReferenceDocument.create({
          title,
          filename: file.originalname,
          storage_path: file.path,
          mime_type: file.mimetype,
          size: file.size,
          text_content: textContent,
          created_by_user_id: createdBy,
          created_at: now,
          updated_at: now
        });

        return res.status(201).json(doc);
      } catch (error) {
        console.error('Error uploading reference document:', error);

        if (
          error instanceof Error &&
          error.message &&
          error.message.startsWith('Недопустимый тип файла')
        ) {
          return res.status(400).json({
            error: 'invalid_file_type',
            message: error.message
          });
        }

        return res.status(500).json({
          error: 'upload_failed',
          message: 'Не удалось загрузить справочный документ.'
        });
      }
    }
  );

  // Обновление справочного документа (app-admin / dictionary-admin)
  router.patch(
    '/api/reference/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['app-admin', 'dictionary-admin']),
    upload.single('file'),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор справочного документа.'
          });
        }

        const doc = await ReferenceDocument.findByPk(id);
        if (!doc) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Справочный документ не найден.'
          });
        }

        const title = req.body && typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const file = req.file || null;

        if (!title && !file) {
          return res.status(400).json({
            error: 'empty_update',
            message: 'Передайте новое название и/или новый файл.'
          });
        }

        if (title) {
          doc.title = title;
        }

        if (file) {
          const oldPath = doc.storage_path;
          doc.filename = file.originalname;
          doc.storage_path = file.path;
          doc.mime_type = file.mimetype;
          doc.size = file.size;
          doc.text_content = await extractTextFromFile(file.path, file.mimetype);
          if (oldPath && oldPath !== file.path && fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (e) {
              console.warn('Cannot delete old reference file:', oldPath, e.message);
            }
          }
        }

        doc.updated_at = new Date();
        await doc.save();
        return res.json(doc);
      } catch (error) {
        console.error('Error updating reference document:', error);
        if (
          error instanceof Error &&
          error.message &&
          error.message.startsWith('Недопустимый тип файла')
        ) {
          return res.status(400).json({
            error: 'invalid_file_type',
            message: error.message
          });
        }
        return res.status(500).json({
          error: 'update_failed',
          message: 'Не удалось обновить справочный документ.'
        });
      }
    }
  );

  // Удаление справочного документа (app-admin / dictionary-admin)
  router.delete(
    '/api/reference/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['app-admin', 'dictionary-admin']),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор справочного документа.'
          });
        }

        const doc = await ReferenceDocument.findByPk(id);
        if (!doc) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Справочный документ не найден.'
          });
        }

        const filePath = doc.storage_path;
        await doc.destroy();

        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('Cannot delete reference file:', filePath, e.message);
          }
        }

        return res.json({ ok: true });
      } catch (error) {
        console.error('Error deleting reference document:', error);
        return res.status(500).json({
          error: 'delete_failed',
          message: 'Не удалось удалить справочный документ.'
        });
      }
    }
  );

  // Поиск и список справочных документов (доступен всем авторизованным)
  router.get(
    '/api/reference',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const q = (req.query.q || '').trim();
        const limit = Math.min(
          parseInt(req.query.limit, 10) || 50,
          100
        );
        const offset = parseInt(req.query.offset, 10) || 0;

        const sequelize = ReferenceDocument.sequelize;
        const options = {
          limit,
          offset,
          order: [['created_at', 'DESC']]
        };

        if (q) {
          // FULLTEXT поиск по названию и содержимому
          options.where = sequelize.literal(
            `MATCH (title, text_content) AGAINST (${sequelize.escape(
              q
            )} IN BOOLEAN MODE)`
          );
        }

        const { rows, count } = await ReferenceDocument.findAndCountAll(
          options
        );

        return res.json({
          items: rows,
          total: count
        });
      } catch (error) {
        console.error('Error searching reference documents:', error);
        return res.status(500).json({
          error: 'search_failed',
          message: 'Не удалось выполнить поиск по справочнику.'
        });
      }
    }
  );

  // Скачивание файла справочника (доступен всем авторизованным)
  router.get(
    '/api/reference/:id/download',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор справочного документа.'
          });
        }

        const doc = await ReferenceDocument.findByPk(id);
        if (!doc) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Справочный документ не найден.'
          });
        }

        if (!doc.storage_path || !fs.existsSync(doc.storage_path)) {
          return res.status(410).json({
            error: 'file_not_found',
            message: 'Файл справочника не найден на сервере.'
          });
        }

        return res.download(doc.storage_path, doc.filename);
      } catch (error) {
        console.error('Error downloading reference document:', error);
        return res.status(500).json({
          error: 'download_failed',
          message: 'Не удалось скачать справочный документ.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerReferenceRoutes
};
//-----------Экспортируемые модули-----------//

