//-----------Подключаемые модули-----------//
const express = require('express');
const keycloakAuth = require('../auth/keycloakAuth');
const RequestTransportation = require('../../models/RequestTransportation');
const StudentDocument = require('../../models/StudentDocument');
const DocumentReview = require('../../models/DocumentReview');
const { buildSimpleFieldsPdf, buildStudentDocumentPdf } = require('./documentPdfExport');
const { loadPdfDictionaryMaps } = require('./pdfDictionaryMaps');
const { comparePayloads, formatDiffValue } = require('./documentPayloadDiff');
//-----------Подключаемые модули-----------//

const DOCUMENT_TYPES = {
  transportation: 'transportation_request',
  invoice: 'invoice',
  common_act: 'common_act',
  commercial_act: 'commercial_act',
  reminder: 'reminder',
  filling_statement: 'filling_statement',
  cumulative_statement: 'cumulative_statement'
};

const DOCUMENT_TYPE_LABELS = {
  transportation_request: 'Заявка на грузоперевозку',
  invoice: 'Накладная',
  common_act: 'Акт общей формы (ГУ-23)',
  commercial_act: 'Коммерческий акт (ГУ-22)',
  reminder: 'Памятка приемосдатчика',
  filling_statement: 'Ведомость подачи и уборки',
  cumulative_statement: 'Накопительная ведомость'
};

function getUserId(req) {
  const user = req.user || {};
  return user.sub || null;
}

function ensureAuth(req, res, next) {
  if (!getUserId(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Требуется авторизация' });
  }
  next();
}

/**
 * Формирует сводный список документов пользователя (заявки + student_documents).
 */
async function listDocuments(userId, options = {}) {
  const { documentType, includeDeleted = false } = options;
  const list = [];
  const reviews = await DocumentReview.findAll({
    where: { student_user_id: userId },
    order: [['version_no', 'DESC'], ['submitted_at', 'DESC']],
    raw: true
  });
  const latestReviewByDoc = new Map();
  for (const r of reviews) {
    const key = `${r.document_source}:${r.document_id}`;
    if (!latestReviewByDoc.has(key)) latestReviewByDoc.set(key, r);
  }

  if (!documentType || documentType === DOCUMENT_TYPES.transportation) {
    const where = { user_id: userId };
    if (!includeDeleted) where.deleted_at = null;
    const transportations = await RequestTransportation.findAll({
      where,
      order: [['created_at', 'DESC']],
      raw: true
    });
    transportations.forEach((row) => {
      const review = latestReviewByDoc.get(`transportation:${row.id}`) || null;
      list.push({
        source: 'transportation',
        type: DOCUMENT_TYPES.transportation,
        typeLabel: DOCUMENT_TYPE_LABELS.transportation_request,
        id: row.id,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
        signed: row.document_status != null,
        summary: `Заявка № ${row.id}`,
        reviewStatus: review?.status || null,
        reviewGrade: review?.grade || null,
        reviewAcceptance: review?.acceptance || null,
        reviewCanRework: review?.can_rework ?? null,
        reviewSubmittedAt: review?.submitted_at || null,
        reviewedAt: review?.reviewed_at || null
      });
    });
  }

  const studentWhere = { user_id: userId };
  if (!includeDeleted) studentWhere.deleted_at = null;
  if (documentType && documentType !== DOCUMENT_TYPES.transportation) {
    studentWhere.document_type = documentType;
  }
  const studentDocs = await StudentDocument.findAll({
    where: studentWhere,
    order: [['created_at', 'DESC']],
    raw: true
  });
  studentDocs.forEach((row) => {
    const payload = row.payload || {};
    const docId = payload.id || row.id;
    const review = latestReviewByDoc.get(`student:${row.id}`) || null;
    list.push({
      source: 'student',
      type: row.document_type,
      typeLabel: DOCUMENT_TYPE_LABELS[row.document_type] || row.document_type,
      id: row.id,
      documentId: docId,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      signed: !!payload.signed,
      summary: `${DOCUMENT_TYPE_LABELS[row.document_type] || row.document_type} № ${docId}`,
      isExemplar: !!row.is_exemplar,
      exemplarTitle: row.exemplar_title || null,
      referenceExemplarId: row.reference_exemplar_id != null ? row.reference_exemplar_id : null,
      reviewStatus: review?.status || row.latest_review_status || null,
      reviewGrade: review?.grade || row.latest_review_grade || null,
      reviewAcceptance: review?.acceptance || row.latest_review_acceptance || null,
      reviewCanRework: review?.can_rework ?? row.latest_review_can_rework ?? null,
      reviewSubmittedAt: review?.submitted_at || null,
      reviewedAt: review?.reviewed_at || row.latest_reviewed_at || null
    });
  });

  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

function registerDocumentsRoutes(app) {
  const router = express.Router();

  // Список заявок на перевозку текущего пользователя (для модуля «Заявка» и для сводки)
  router.get('/api/requests_transportation', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const includeDeleted = req.query.include_deleted === '1' || req.query.include_deleted === 'true';
      const where = { user_id: userId };
      if (!includeDeleted) where.deleted_at = null;
      const list = await RequestTransportation.findAll({
        where,
        order: [['created_at', 'DESC']],
        raw: true
      });
      return res.json(list);
    } catch (err) {
      console.error('GET /api/requests_transportation', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.get('/api/documents', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const documentType = req.query.type || null;
      const includeDeleted = req.query.include_deleted === '1' || req.query.include_deleted === 'true';
      const list = await listDocuments(userId, { documentType, includeDeleted });
      return res.json(list);
    } catch (err) {
      console.error('GET /api/documents', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.get('/api/documents/transportation/:id', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await RequestTransportation.findByPk(id, { raw: true });
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      return res.json(row);
    } catch (err) {
      console.error('GET /api/documents/transportation/:id', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.patch('/api/documents/transportation/:id', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await RequestTransportation.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      const { action } = req.body || {};
      if (action === 'delete') {
        row.deleted_at = new Date();
        await row.save();
        return res.json({ ok: true, deleted: true });
      }
      if (action === 'restore') {
        row.deleted_at = null;
        await row.save();
        return res.json({ ok: true, restored: true });
      }
      return res.status(400).json({ error: 'invalid_action' });
    } catch (err) {
      console.error('PATCH /api/documents/transportation/:id', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.get('/api/documents/student/:id', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await StudentDocument.findByPk(id, { raw: true });
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      return res.json(row);
    } catch (err) {
      console.error('GET /api/documents/student/:id', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.post('/api/documents/student', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { document_type, payload } = req.body || {};
      const allowed = Object.values(DOCUMENT_TYPES).filter(t => t !== DOCUMENT_TYPES.transportation);
      if (!document_type || !allowed.includes(document_type)) {
        return res.status(400).json({ error: 'invalid_document_type', allowed });
      }
      const doc = await StudentDocument.create({
        user_id: userId,
        document_type,
        payload: payload || {}
      });
      return res.status(201).json(doc);
    } catch (err) {
      console.error('POST /api/documents/student', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.patch('/api/documents/student/:id', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await StudentDocument.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      const { action, payload } = req.body || {};

      const isTeacherOrAdmin =
        keycloakAuth.hasRealmRole(req.user, 'teacher') ||
        keycloakAuth.hasRealmRole(req.user, 'app-admin');

      if (action === 'delete') {
        row.deleted_at = new Date();
        await row.save();
        return res.json({ ok: true, deleted: true });
      }
      if (action === 'restore') {
        row.deleted_at = null;
        await row.save();
        return res.json({ ok: true, restored: true });
      }
      if (action === 'set_exemplar') {
        if (!isTeacherOrAdmin) {
          return res.status(403).json({
            error: 'forbidden',
            message: 'Помечать образец могут только преподаватель или администратор.'
          });
        }
        row.is_exemplar = true;
        const t = req.body.exemplar_title;
        row.exemplar_title = t != null && String(t).trim() ? String(t).trim().slice(0, 255) : null;
        await row.save();
        return res.json(row);
      }
      if (action === 'unset_exemplar') {
        if (!isTeacherOrAdmin) {
          return res.status(403).json({
            error: 'forbidden',
            message: 'Снимать метку образца могут только преподаватель или администратор.'
          });
        }
        row.is_exemplar = false;
        row.exemplar_title = null;
        await row.save();
        return res.json(row);
      }
      if (action === 'set_reference_exemplar') {
        const rawEx = req.body.exemplar_id;
        if (rawEx == null || rawEx === '') {
          row.reference_exemplar_id = null;
          await row.save();
          return res.json(row);
        }
        const exId = parseInt(rawEx, 10);
        if (isNaN(exId)) return res.status(400).json({ error: 'invalid_exemplar_id' });
        const ex = await StudentDocument.findByPk(exId);
        if (!ex || ex.deleted_at) {
          return res.status(404).json({ error: 'exemplar_not_found', message: 'Образец не найден.' });
        }
        if (!ex.is_exemplar) {
          return res.status(400).json({ error: 'not_an_exemplar', message: 'Указанная запись не помечена как образец.' });
        }
        if (ex.document_type !== row.document_type) {
          return res.status(400).json({
            error: 'document_type_mismatch',
            message: 'Тип документа образца не совпадает с вашим документом.'
          });
        }
        row.reference_exemplar_id = exId;
        await row.save();
        return res.json(row);
      }
      if (payload !== undefined) {
        row.payload = payload;
        await row.save();
        return res.json(row);
      }
      return res.status(400).json({ error: 'invalid_request' });
    } catch (err) {
      console.error('PATCH /api/documents/student/:id', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  /** Список образцов преподавателей (для сравнения). */
  router.get('/api/documents/exemplars', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const documentType = req.query.document_type || req.query.type || null;
      const where = { is_exemplar: true, deleted_at: null };
      if (documentType) where.document_type = String(documentType);
      const rows = await StudentDocument.findAll({
        where,
        attributes: ['id', 'document_type', 'exemplar_title', 'created_at'],
        order: [['created_at', 'DESC']],
        raw: true
      });
      return res.json({
        items: rows.map((r) => ({
          id: r.id,
          document_type: r.document_type,
          exemplar_title: r.exemplar_title,
          created_at: r.created_at
        }))
      });
    } catch (err) {
      console.error('GET /api/documents/exemplars', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  /** Сравнение заполнения с образцом. */
  router.post('/api/documents/student/:id/compare', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await StudentDocument.findByPk(id);
      if (!row || row.deleted_at) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });

      let exemplarId = req.body?.exemplarId;
      if (exemplarId === undefined || exemplarId === null || exemplarId === '') {
        exemplarId = row.reference_exemplar_id;
      } else {
        exemplarId = parseInt(exemplarId, 10);
      }
      if (exemplarId == null || Number.isNaN(exemplarId)) {
        return res.status(400).json({
          error: 'exemplar_required',
          message: 'Укажите номер образца (exemplarId) в теле запроса или сохраните образец по умолчанию для документа.'
        });
      }

      const ex = await StudentDocument.findByPk(exemplarId);
      if (!ex || ex.deleted_at) {
        return res.status(404).json({ error: 'exemplar_not_found', message: 'Образец не найден.' });
      }
      if (!ex.is_exemplar) {
        return res.status(400).json({ error: 'not_an_exemplar', message: 'Указанная запись не является образцом.' });
      }
      if (ex.document_type !== row.document_type) {
        return res.status(400).json({
          error: 'document_type_mismatch',
          message: 'Тип документа образца не совпадает с документом.'
        });
      }

      const result = comparePayloads(row.payload || {}, ex.payload || {});
      const differences = result.differences.map((d) => ({
        path: d.path,
        label: d.label,
        kind: d.kind,
        expected: d.expected,
        actual: d.actual,
        expectedFormatted: formatDiffValue(d.expected),
        actualFormatted: formatDiffValue(d.actual)
      }));

      return res.json({
        documentType: row.document_type,
        exemplarId,
        exemplarTitle: ex.exemplar_title,
        match: result.match,
        summary: result.summary,
        differences
      });
    } catch (err) {
      console.error('POST /api/documents/student/:id/compare', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.get('/api/documents/transportation/:id/pdf', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await RequestTransportation.findByPk(id, { raw: true });
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      const title = `Заявка на грузоперевозку № ${row.id}`;
      const fields = {
        'ID': row.id,
        'Дата регистрации': row.registration_date,
        'Период перевозки с': row.transportation_date_from,
        'Период перевозки по': row.transportation_date_to,
        'Статус': row.document_status
      };
      const pdfBuffer = await buildSimpleFieldsPdf(title, fields);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="zayavka-${row.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('GET /api/documents/transportation/:id/pdf', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  router.get('/api/documents/student/:id/pdf', keycloakAuth.verifyToken(), ensureAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
      const row = await StudentDocument.findByPk(id, { raw: true });
      if (!row) return res.status(404).json({ error: 'not_found' });
      if (row.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
      const payload = row.payload || {};
      const typeLabel = DOCUMENT_TYPE_LABELS[row.document_type] || row.document_type;
      let dictionaryMaps = null;
      try {
        dictionaryMaps = await loadPdfDictionaryMaps(payload);
      } catch (dictErr) {
        console.error('GET /api/documents/student/:id/pdf dictionary maps', dictErr);
      }
      const pdfBuffer = await buildStudentDocumentPdf(row.document_type, typeLabel, payload, {
        rowId: row.id,
        createdAt: row.created_at,
      }, { dictionaryMaps });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="document-${row.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('GET /api/documents/student/:id/pdf', err);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  });

  app.use(router);
}

module.exports = { registerDocumentsRoutes, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS };
