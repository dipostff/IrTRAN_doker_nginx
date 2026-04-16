const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const keycloakAuth = require('../auth/keycloakAuth');
const BugReport = require('../../models/BugReport');

const STATUSES = ['отправлено', 'на рассмотрении', 'работаем над ошибкой', 'ошибка исправлена'];
const bugReportsUploadDir =
  process.env.BUGREPORTS_UPLOAD_DIR ||
  path.join(__dirname, '../../../uploads/bug-reports');

if (!fs.existsSync(bugReportsUploadDir)) {
  fs.mkdirSync(bugReportsUploadDir, { recursive: true });
}

const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, bugReportsUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${unique}${ext || '.png'}`);
  }
});

const uploadScreenshots = multer({
  storage: screenshotStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  },
  fileFilter(req, file, cb) {
    if ((file.mimetype || '').startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('invalid_image_type'));
  }
});

function getUserId(req) {
  const user = req.user || {};
  return user.sub || null;
}

function isAdmin(req) {
  if (!req.user || !req.user.realm_access || !Array.isArray(req.user.realm_access.roles)) {
    return false;
  }
  return req.user.realm_access.roles.includes('app-admin');
}

function withScreenshotPaths(reportRaw) {
  const report = { ...(reportRaw || {}) };
  let parsed = [];
  try {
    parsed = report.screenshot_paths ? JSON.parse(report.screenshot_paths) : [];
    if (!Array.isArray(parsed)) parsed = [];
  } catch (e) {
    parsed = [];
  }
  report.screenshot_paths = parsed;
  return report;
}

function registerBugReportsRoutes(app) {
  const router = express.Router();

  router.post(
    '/api/bug-reports',
    keycloakAuth.verifyToken(),
    uploadScreenshots.array('screenshots', 5),
    async (req, res) => {
      try {
        const userId = getUserId(req);
        const { reporter_name, module_name, description, devtools_error } = req.body || {};
        if (!reporter_name || !reporter_name.trim()) {
          return res.status(400).json({ error: 'reporter_name_required', message: 'Укажите имя того, кто нашёл ошибку.' });
        }
        if (!module_name || !module_name.trim()) {
          return res.status(400).json({ error: 'module_name_required', message: 'Укажите название модуля.' });
        }
        const devtoolsText = devtools_error != null && String(devtools_error).trim() !== ''
          ? String(devtools_error).trim()
          : 'ошибки в DevTools нет';
        const screenshotFiles = Array.isArray(req.files) ? req.files : [];
        const screenshotPaths = screenshotFiles.map((f) => path.basename(f.path));
        const report = await BugReport.create({
          user_id: userId,
          reporter_name: reporter_name.trim(),
          module_name: module_name.trim(),
          description: description != null ? String(description).trim() : null,
          status: 'отправлено',
          devtools_error: devtoolsText,
          screenshot_paths: screenshotPaths.length ? JSON.stringify(screenshotPaths) : null
        });
        return res.status(201).json(withScreenshotPaths(report.toJSON()));
      } catch (err) {
        console.error('POST /api/bug-reports', err);
        if (err && err.message === 'invalid_image_type') {
          return res.status(400).json({
            error: 'invalid_image_type',
            message: 'Допустимы только изображения (png, jpg, webp и т.д.).'
          });
        }
        if (err && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'file_too_large',
            message: 'Размер одного изображения не должен превышать 10 МБ.'
          });
        }
        return res.status(500).json({ error: 'server_error', message: err.message });
      }
    }
  );

  router.get(
    '/api/bug-reports',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const userId = getUserId(req);
        const admin = isAdmin(req);
        const where = admin ? {} : { user_id: userId };
        const list = await BugReport.findAll({
          where,
          order: [['created_at', 'DESC']],
          raw: true
        });
        return res.json(list.map(withScreenshotPaths));
      } catch (err) {
        console.error('GET /api/bug-reports', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
      }
    }
  );

  router.get(
    '/api/bug-reports/:id',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
        const report = await BugReport.findByPk(id, { raw: true });
        if (!report) return res.status(404).json({ error: 'not_found' });
        const userId = getUserId(req);
        const admin = isAdmin(req);
        if (!admin && report.user_id !== userId) {
          return res.status(403).json({ error: 'forbidden' });
        }
        return res.json(withScreenshotPaths(report));
      } catch (err) {
        console.error('GET /api/bug-reports/:id', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
      }
    }
  );

  router.get(
    '/api/bug-reports/:id/screenshots/:fileName',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
        const fileName = path.basename(String(req.params.fileName || ''));
        if (!fileName) return res.status(400).json({ error: 'invalid_file_name' });

        const report = await BugReport.findByPk(id, { raw: true });
        if (!report) return res.status(404).json({ error: 'not_found' });

        const userId = getUserId(req);
        const admin = isAdmin(req);
        if (!admin && report.user_id !== userId) {
          return res.status(403).json({ error: 'forbidden' });
        }

        const withPaths = withScreenshotPaths(report);
        if (!withPaths.screenshot_paths.includes(fileName)) {
          return res.status(404).json({ error: 'file_not_found' });
        }

        const fullPath = path.join(bugReportsUploadDir, fileName);
        if (!fs.existsSync(fullPath)) {
          return res.status(410).json({ error: 'file_gone' });
        }
        return res.sendFile(fullPath);
      } catch (err) {
        console.error('GET /api/bug-reports/:id/screenshots/:fileName', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
      }
    }
  );

  router.patch(
    '/api/bug-reports/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
        const report = await BugReport.findByPk(id);
        if (!report) return res.status(404).json({ error: 'not_found' });
        const { status, admin_response } = req.body || {};
        if (status !== undefined) {
          if (!STATUSES.includes(status)) {
            return res.status(400).json({ error: 'invalid_status', allowed: STATUSES });
          }
          report.status = status;
        }
        if (admin_response !== undefined) {
          report.admin_response = admin_response == null ? null : String(admin_response).trim();
        }
        await report.save();
        return res.json(report);
      } catch (err) {
        console.error('PATCH /api/bug-reports/:id', err);
        return res.status(500).json({ error: 'server_error', message: err.message });
      }
    }
  );

  app.use(router);
}

module.exports = { registerBugReportsRoutes, STATUSES };
