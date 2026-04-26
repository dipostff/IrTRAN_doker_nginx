const express = require('express');
const { Op } = require('sequelize');
const keycloakAuth = require('../auth/keycloakAuth');
const {
  listTeacherOwnedGroups,
  listGroupMembers,
  listUserGroups,
  resolveTeacherIdsFromUserGroups,
  listUsers
} = require('../auth/keycloakAdmin');
const RequestTransportation = require('../../models/RequestTransportation');
const StudentDocument = require('../../models/StudentDocument');
const DocumentReview = require('../../models/DocumentReview');
const DocumentReviewTemplate = require('../../models/DocumentReviewTemplate');
const Notification = require('../../models/Notification');
const { comparePayloads } = require('./documentPayloadDiff');
const { DOCUMENT_TYPE_LABELS } = require('./documentsRoutes');

function getUserId(req) {
  return req.user?.sub || null;
}

function isTeacherOrAdmin(req) {
  return (
    keycloakAuth.hasRealmRole(req.user, 'teacher') ||
    keycloakAuth.hasRealmRole(req.user, 'app-admin')
  );
}

function isAdmin(req) {
  return keycloakAuth.hasRealmRole(req.user, 'app-admin');
}

async function loadDocumentBySourceForStudentOwner(source, id, userId) {
  if (source === 'transportation') {
    const row = await RequestTransportation.findByPk(id, { raw: true });
    if (!row) return null;
    if (String(row.user_id) !== String(userId)) return 'forbidden';
    return {
      source,
      id: row.id,
      document_type: 'transportation_request',
      student_user_id: String(row.user_id),
      payload_snapshot: row
    };
  }
  if (source === 'student') {
    const row = await StudentDocument.findByPk(id, { raw: true });
    if (!row) return null;
    if (String(row.user_id) !== String(userId)) return 'forbidden';
    return {
      source,
      id: row.id,
      document_type: row.document_type,
      student_user_id: String(row.user_id),
      payload_snapshot: row.payload || {}
    };
  }
  return null;
}

async function getTeacherStudentIds(req) {
  if (isAdmin(req)) return null;
  const teacherId = getUserId(req);
  const groups = await listTeacherOwnedGroups(teacherId);
  const ids = new Set();
  for (const g of groups || []) {
    // eslint-disable-next-line no-await-in-loop
    const members = await listGroupMembers(g.id);
    for (const m of members || []) {
      ids.add(String(m.id));
    }
  }
  return ids;
}

async function notifyTeacherAboutSubmission(studentUserId, documentType, reviewId, teacherIds) {
  const now = new Date();
  const label = DOCUMENT_TYPE_LABELS[documentType] || documentType;
  for (const tId of teacherIds) {
    // eslint-disable-next-line no-await-in-loop
    await Notification.create({
      user_id: String(tId),
      title: `Новый документ на проверку: ${label}`,
      message: `Студент отправил документ на проверку. Номер отправки #${reviewId}.`,
      type: 'info',
      link: '/document-review',
      is_read: false,
      created_by_user_id: studentUserId,
      external_key: `doc-review-submit:${reviewId}:${tId}`,
      created_at: now,
      updated_at: now
    });
  }
}

function registerDocumentReviewRoutes(app) {
  const router = express.Router();

  async function buildTeacherScope(req) {
    if (isAdmin(req)) return { where: {}, studentIds: null };
    const studentIds = await getTeacherStudentIds(req);
    return {
      where: { student_user_id: { [Op.in]: Array.from(studentIds || []) } },
      studentIds
    };
  }

  router.post('/api/document-review/submit', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      const studentUserId = getUserId(req);
      if (!studentUserId) return res.status(401).json({ error: 'unauthorized' });
      const source = String(req.body?.source || '');
      const documentId = parseInt(req.body?.documentId, 10);
      if (!['student', 'transportation'].includes(source) || Number.isNaN(documentId)) {
        return res.status(400).json({ error: 'bad_request', message: 'Некорректные source/documentId.' });
      }

      const doc = await loadDocumentBySourceForStudentOwner(source, documentId, studentUserId);
      if (!doc) return res.status(404).json({ error: 'document_not_found' });
      if (doc === 'forbidden') return res.status(403).json({ error: 'forbidden' });

      const latest = await DocumentReview.findOne({
        where: { document_source: source, document_id: documentId, student_user_id: studentUserId },
        order: [['version_no', 'DESC']]
      });
      if (latest && latest.status === 'submitted') {
        return res.status(409).json({
          error: 'already_submitted',
          message: 'Документ уже отправлен и ожидает проверки.'
        });
      }
      if (latest && latest.status === 'reviewed') {
        if (latest.acceptance === 'accepted') {
          return res.status(409).json({
            error: 'already_accepted',
            message: 'Документ уже принят преподавателем.'
          });
        }
        if (latest.acceptance === 'rejected' && !latest.can_rework) {
          return res.status(409).json({
            error: 'rework_forbidden',
            message: 'Преподаватель запретил переделку этой отправки. Создайте новый документ.'
          });
        }
      }

      const userGroups = await listUserGroups(studentUserId);
      const teacherIds = resolveTeacherIdsFromUserGroups(userGroups);
      if (!teacherIds.length) {
        return res.status(409).json({
          error: 'teacher_not_found',
          message: 'Для студента не найден преподаватель группы. Обратитесь к администратору.'
        });
      }

      const review = await DocumentReview.create({
        document_source: source,
        document_id: documentId,
        document_type: doc.document_type,
        student_user_id: studentUserId,
        version_no: (latest?.version_no || 0) + 1,
        status: 'submitted',
        submitted_at: new Date(),
        payload_snapshot: doc.payload_snapshot
      });

      if (source === 'student') {
        await StudentDocument.update({
          latest_review_status: 'submitted',
          latest_review_grade: null,
          latest_review_acceptance: null,
          latest_review_can_rework: null,
          latest_reviewed_at: null
        }, { where: { id: documentId } });
      }

      await notifyTeacherAboutSubmission(studentUserId, doc.document_type, review.id, teacherIds);
      return res.status(201).json({ ok: true, reviewId: review.id, status: 'submitted' });
    } catch (error) {
      console.error('POST /api/document-review/submit', error);
      return res.status(500).json({ error: 'submit_failed', message: 'Не удалось отправить документ на проверку.' });
    }
  });

  router.get('/api/document-review/my', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      const studentUserId = getUserId(req);
      if (!studentUserId) return res.status(401).json({ error: 'unauthorized' });
      const rows = await DocumentReview.findAll({
        where: { student_user_id: studentUserId },
        order: [['submitted_at', 'DESC']]
      });
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/document-review/my', error);
      return res.status(500).json({ error: 'my_reviews_failed', message: 'Не удалось загрузить проверки документов.' });
    }
  });

  router.get('/api/document-review/teacher/submissions', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const status = req.query.status ? String(req.query.status) : null;
      const where = {};
      if (status) where.status = status;

      const scope = await buildTeacherScope(req);
      Object.assign(where, scope.where);

      const rows = await DocumentReview.findAll({
        where,
        order: [['submitted_at', 'DESC']],
        limit: 500
      });

      const userIds = Array.from(new Set(rows.map((r) => String(r.student_user_id))));
      const users = await listUsers();
      const byId = new Map(users.map((u) => [String(u.id), u]));

      return res.json(rows.map((r) => {
        const u = byId.get(String(r.student_user_id));
        return {
          ...r.toJSON(),
          student_name: u ? `${u.lastName || ''} ${u.firstName || ''}`.trim() : '',
          student_username: u?.username || '',
          student_email: u?.email || ''
        };
      }));
    } catch (error) {
      console.error('GET /api/document-review/teacher/submissions', error);
      return res.status(500).json({ error: 'teacher_submissions_failed', message: 'Не удалось загрузить отправки на проверку.' });
    }
  });

  router.get('/api/document-review/teacher/submissions/:id', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await DocumentReview.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });

      if (!isAdmin(req)) {
        const studentIds = await getTeacherStudentIds(req);
        if (!studentIds.has(String(row.student_user_id))) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }
      return res.json(row);
    } catch (error) {
      console.error('GET /api/document-review/teacher/submissions/:id', error);
      return res.status(500).json({ error: 'submission_detail_failed' });
    }
  });

  router.get('/api/document-review/teacher/submissions/:id/audit-trail', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await DocumentReview.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });

      if (!isAdmin(req)) {
        const studentIds = await getTeacherStudentIds(req);
        if (!studentIds.has(String(row.student_user_id))) {
          return res.status(403).json({ error: 'forbidden' });
        }
      }

      const history = await DocumentReview.findAll({
        where: {
          student_user_id: row.student_user_id,
          document_source: row.document_source,
          document_id: row.document_id
        },
        order: [['version_no', 'ASC'], ['updated_at', 'ASC']]
      });

      return res.json(history.map((x) => ({
        id: x.id,
        version_no: x.version_no,
        status: x.status,
        submitted_at: x.submitted_at,
        reviewed_at: x.reviewed_at,
        updated_at: x.updated_at,
        reviewed_by_teacher_id: x.reviewed_by_teacher_id,
        check_mode: x.check_mode,
        algorithm_recommendation: x.algorithm_recommendation,
        acceptance: x.acceptance,
        grade: x.grade,
        can_rework: x.can_rework,
        teacher_comment: x.teacher_comment
      })));
    } catch (error) {
      console.error('GET /api/document-review/teacher/submissions/:id/audit-trail', error);
      return res.status(500).json({ error: 'audit_trail_failed' });
    }
  });

  router.get('/api/document-review/teacher/metrics', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const scope = await buildTeacherScope(req);

      const allRows = await DocumentReview.findAll({
        where: scope.where,
        order: [['submitted_at', 'DESC']]
      });

      const pendingCount = allRows.filter((r) => r.status === 'submitted').length;
      const reviewedRows = allRows.filter((r) => r.status === 'reviewed');
      const reviewedCount = reviewedRows.length;
      const acceptedCount = reviewedRows.filter((r) => r.acceptance === 'accepted').length;
      const rejectedCount = reviewedRows.filter((r) => r.acceptance === 'rejected').length;

      let totalMs = 0;
      let withDuration = 0;
      for (const r of reviewedRows) {
        if (!r.submitted_at || !r.reviewed_at) continue;
        const start = new Date(r.submitted_at).getTime();
        const end = new Date(r.reviewed_at).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          totalMs += (end - start);
          withDuration += 1;
        }
      }
      const avgReviewHours = withDuration ? Number((totalMs / withDuration / 3600000).toFixed(2)) : 0;

      return res.json({
        pendingCount,
        reviewedCount,
        acceptedCount,
        rejectedCount,
        avgReviewHours
      });
    } catch (error) {
      console.error('GET /api/document-review/teacher/metrics', error);
      return res.status(500).json({ error: 'metrics_failed' });
    }
  });

  router.get('/api/document-review/templates', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const items = await DocumentReviewTemplate.findAll({ order: [['document_type', 'ASC']] });
      return res.json(items);
    } catch (error) {
      console.error('GET /api/document-review/templates', error);
      return res.status(500).json({ error: 'templates_list_failed' });
    }
  });

  router.put('/api/document-review/templates/:documentType', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const documentType = String(req.params.documentType || '');
      const payload = req.body?.payload;
      if (!documentType || payload == null || typeof payload !== 'object') {
        return res.status(400).json({ error: 'bad_payload', message: 'Передайте корректный payload шаблона.' });
      }
      const now = new Date();
      const [row, created] = await DocumentReviewTemplate.findOrCreate({
        where: { document_type: documentType },
        defaults: { document_type: documentType, payload, updated_by_user_id: getUserId(req), created_at: now, updated_at: now }
      });
      if (!created) {
        await row.update({ payload, updated_by_user_id: getUserId(req), updated_at: now });
      }
      return res.json(row);
    } catch (error) {
      console.error('PUT /api/document-review/templates/:documentType', error);
      return res.status(500).json({ error: 'template_save_failed' });
    }
  });

  router.post('/api/document-review/teacher/submissions/:id/analyze', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await DocumentReview.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      const tpl = await DocumentReviewTemplate.findOne({ where: { document_type: row.document_type } });
      if (!tpl) {
        return res.status(404).json({
          error: 'template_not_found',
          message: 'Для этого типа документа не задан эталонный шаблон.'
        });
      }
      const result = comparePayloads(row.payload_snapshot || {}, tpl.payload || {});
      const recommendation = result.summary.diffCount === 0 ? 'accepted' : 'rejected';
      const summaryText = result.summary.diffCount === 0
        ? 'Расхождений с эталоном не обнаружено.'
        : `Найдено расхождений: ${result.summary.diffCount}. Совпадение: ${result.summary.equalFields}/${result.summary.totalFields}.`;

      await row.update({
        check_mode: 'algorithm',
        algorithm_summary: summaryText,
        algorithm_recommendation: recommendation
      });

      return res.json({
        summary: row.algorithm_summary,
        recommendation,
        differences: result.differences || []
      });
    } catch (error) {
      console.error('POST /api/document-review/teacher/submissions/:id/analyze', error);
      return res.status(500).json({ error: 'analyze_failed' });
    }
  });

  router.patch('/api/document-review/teacher/submissions/:id/finalize', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'forbidden' });
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await DocumentReview.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      const acceptance = String(req.body?.acceptance || '').toLowerCase();
      if (!['accepted', 'rejected'].includes(acceptance)) {
        return res.status(400).json({ error: 'bad_acceptance', message: 'acceptance должен быть accepted или rejected.' });
      }
      const grade = req.body?.grade != null ? String(req.body.grade).trim().slice(0, 16) : null;
      const teacherComment = req.body?.comment != null ? String(req.body.comment).trim() : null;
      const canRework = req.body?.canRework === undefined ? true : !!req.body.canRework;
      const mode = req.body?.checkMode ? String(req.body.checkMode) : (row.check_mode || 'manual');

      await row.update({
        status: 'reviewed',
        reviewed_at: new Date(),
        reviewed_by_teacher_id: getUserId(req),
        acceptance,
        grade,
        teacher_comment: teacherComment || null,
        can_rework: canRework,
        check_mode: mode
      });

      if (row.document_source === 'student') {
        await StudentDocument.update({
          latest_review_status: 'reviewed',
          latest_review_grade: grade,
          latest_review_acceptance: acceptance,
          latest_review_can_rework: canRework,
          latest_reviewed_at: row.reviewed_at
        }, { where: { id: row.document_id } });
      }

      await Notification.create({
        user_id: row.student_user_id,
        title: `Проверка завершена: ${DOCUMENT_TYPE_LABELS[row.document_type] || row.document_type}`,
        message: acceptance === 'accepted'
          ? 'Работа принята преподавателем.'
          : `Работа не принята.${canRework ? ' Можно переделать и отправить повторно.' : ' Переделка запрещена, создайте новый документ.'}`,
        type: acceptance === 'accepted' ? 'success' : 'warning',
        link: '/student-performance',
        is_read: false,
        created_by_user_id: getUserId(req),
        external_key: `doc-review-reviewed:${row.id}:${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date()
      });

      return res.json(row);
    } catch (error) {
      console.error('PATCH /api/document-review/teacher/submissions/:id/finalize', error);
      return res.status(500).json({ error: 'finalize_failed' });
    }
  });

  app.use(router);
}

module.exports = { registerDocumentReviewRoutes };
