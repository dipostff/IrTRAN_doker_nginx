//-----------Подключаемые модули-----------//
const express = require('express');
const { Op } = require('sequelize');
const keycloakAuth = require('./../auth/keycloakAuth');
const sequelize = require('./../sequelize/db');
const Test = require('./../../models/Test');
const TestAttempt = require('./../../models/TestAttempt');
const Scenario = require('./../../models/Scenario');
const ScenarioView = require('./../../models/ScenarioView');
const ReferenceDocument = require('./../../models/ReferenceDocument');
const ReferenceDocumentView = require('./../../models/ReferenceDocumentView');
const StudentProfile = require('./../../models/StudentProfile');
const StudentProfileChangeRequest = require('./../../models/StudentProfileChangeRequest');
const BeginnerScenarioSession = require('./../../models/BeginnerScenarioSession');
const DocumentReview = require('./../../models/DocumentReview');
const { DOCUMENT_TYPE_LABELS } = require('./../documents/documentsRoutes');
//-----------Подключаемые модули-----------//

function requirePureStudent(req, res, next) {
  const u = req.user;
  if (!u) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!keycloakAuth.hasRealmRole(u, 'student')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Раздел доступен только пользователям с ролью студента.'
    });
  }
  if (
    keycloakAuth.hasRealmRole(u, 'teacher') ||
    keycloakAuth.hasRealmRole(u, 'app-admin')
  ) {
    return res.status(403).json({
      error: 'forbidden',
      message:
        'Модуль «Успеваемость» предназначен для учебных аккаунтов студентов (без ролей преподавателя и администратора).'
    });
  }
  next();
}

async function countUserDocumentsBetween(userId, from, to) {
  const [rows1] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM requests_transportation
     WHERE user_id = ? AND deleted_at IS NULL
       AND created_at IS NOT NULL AND created_at >= ? AND created_at <= ?`,
    { replacements: [userId, from, to] }
  );
  const [rows2] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM student_documents
     WHERE user_id = ? AND deleted_at IS NULL
       AND created_at IS NOT NULL AND created_at >= ? AND created_at <= ?`,
    { replacements: [userId, from, to] }
  );
  const c1 = rows1 && rows1[0] ? Number(rows1[0].c) : 0;
  const c2 = rows2 && rows2[0] ? Number(rows2[0].c) : 0;
  return c1 + c2;
}

function registerStudentRoutes(app) {
  const router = express.Router();

  router.get(
    '/api/student/performance',
    keycloakAuth.verifyToken(),
    requirePureStudent,
    async (req, res) => {
      try {
        const u = req.user || {};
        const userId = String(u.sub || '');
        if (!userId) {
          return res.status(401).json({ error: 'unauthorized' });
        }

        const identity = {
          userId,
          email: u.email || null,
          firstName: u.given_name || u.givenName || null,
          lastName: u.family_name || u.familyName || null,
          username: u.preferred_username || u.preferredUsername || u.username || null
        };

        const [profile, pendingRequest, tests, attempts, scenarios, views, refDocs, refViews, sessions, documentReviews] =
          await Promise.all([
            StudentProfile.findByPk(userId),
            StudentProfileChangeRequest.findOne({
              where: { user_id: userId, status: 'pending' },
              order: [['created_at', 'DESC']]
            }),
            Test.findAll({ order: [['id', 'ASC']] }),
            TestAttempt.findAll({
              where: { user_id: userId },
              order: [['created_at', 'ASC']]
            }),
            Scenario.findAll({ order: [['id', 'ASC']] }),
            ScenarioView.findAll({ where: { user_id: userId } }),
            ReferenceDocument.findAll({
              attributes: ['id', 'title', 'filename'],
              order: [['id', 'ASC']]
            }),
            ReferenceDocumentView.findAll({ where: { user_id: userId } }),
            BeginnerScenarioSession.findAll({
              where: { user_id: userId },
              order: [['started_at', 'DESC']],
              limit: 200
            }),
            DocumentReview.findAll({
              where: { student_user_id: userId },
              order: [['submitted_at', 'DESC']]
            })
          ]);

        const attemptsByTest = new Map();
        for (const a of attempts) {
          const arr = attemptsByTest.get(a.test_id) || [];
          arr.push(a);
          attemptsByTest.set(a.test_id, arr);
        }

        const testsOut = tests.map((t) => {
          const list = attemptsByTest.get(t.id) || [];
          let bestPercent = null;
          let best = null;
          for (const a of list) {
            const p = a.percent != null ? Number(a.percent) : null;
            if (p != null && (bestPercent == null || p > bestPercent)) {
              bestPercent = p;
              best = a;
            }
          }
          const passThreshold =
            t.pass_percent != null && t.pass_percent !== ''
              ? Number(t.pass_percent)
              : null;
          const passed =
            bestPercent != null &&
            passThreshold != null &&
            bestPercent >= passThreshold;
          const hasAttempts = list.length > 0;
          const maxAttempts =
            t.max_attempts != null && Number(t.max_attempts) > 0
              ? Number(t.max_attempts)
              : null;
          const attemptsRemaining =
            maxAttempts != null ? Math.max(0, maxAttempts - list.length) : null;

          return {
            testId: t.id,
            title: t.title,
            passPercent: passThreshold,
            maxAttempts,
            attemptsUsed: list.length,
            attemptsRemaining,
            bestPercent: bestPercent != null ? Math.round(bestPercent * 100) / 100 : null,
            passed: hasAttempts ? !!passed : false,
            notPassedYet: hasAttempts && !passed,
            lastAttemptAt: best?.created_at || list[list.length - 1]?.created_at || null
          };
        });

        const viewsByScenario = new Map();
        for (const v of views) {
          viewsByScenario.set(v.scenario_id, v);
        }
        const scenariosOut = scenarios.map((sc) => {
          const v = viewsByScenario.get(sc.id);
          return {
            scenarioId: sc.id,
            title: sc.title,
            familiarized: !!v,
            firstViewedAt: v?.first_viewed_at || null,
            lastViewedAt: v?.last_viewed_at || null
          };
        });

        const refById = new Map();
        for (const rv of refViews) {
          refById.set(rv.reference_document_id, rv);
        }
        const referenceOut = refDocs.map((doc) => {
          const v = refById.get(doc.id);
          return {
            documentId: doc.id,
            title: doc.title,
            filename: doc.filename,
            familiarized: !!v,
            firstViewedAt: v?.first_viewed_at || null,
            lastViewedAt: v?.last_viewed_at || null,
            viewCount: v?.view_count || 0
          };
        });

        const beginnerSessionsOut = sessions.map((s) => ({
          id: s.id,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          durationSeconds: s.duration_seconds,
          durationFormatted:
            s.duration_seconds != null ? formatDuration(s.duration_seconds) : null,
          documentsCount: s.documents_count,
          open: !s.ended_at
        }));

        const documentReviewsOut = documentReviews.map((r) => ({
          id: r.id,
          source: r.document_source,
          documentId: r.document_id,
          documentType: r.document_type,
          documentTypeLabel: DOCUMENT_TYPE_LABELS[r.document_type] || r.document_type,
          versionNo: r.version_no,
          status: r.status,
          submittedAt: r.submitted_at,
          reviewedAt: r.reviewed_at,
          grade: r.grade,
          acceptance: r.acceptance,
          comment: r.teacher_comment,
          canRework: r.can_rework
        }));

        return res.json({
          identity,
          profile: profile
            ? {
                phone: profile.phone,
                patronymic: profile.patronymic,
                academicGroup: profile.academic_group,
                studentBookId: profile.student_book_id
              }
            : null,
          pendingProfileChange: pendingRequest
            ? {
                id: pendingRequest.id,
                createdAt: pendingRequest.created_at,
                payload: pendingRequest.payload
              }
            : null,
          tests: testsOut,
          scenarios: scenariosOut,
          referenceMaterials: referenceOut,
          documentReviews: documentReviewsOut,
          beginnerScenarioSessions: beginnerSessionsOut,
          beginnerScenarioStats: {
            totalSessions: beginnerSessionsOut.filter((x) => x.endedAt).length,
            totalTimeSeconds: beginnerSessionsOut.reduce(
              (sum, x) => sum + (Number(x.durationSeconds) || 0),
              0
            )
          }
        });
      } catch (error) {
        console.error('Error student performance:', error);
        return res.status(500).json({
          error: 'student_performance_failed',
          message: 'Не удалось загрузить данные успеваемости.'
        });
      }
    }
  );

  router.post(
    '/api/student/profile/change-request',
    keycloakAuth.verifyToken(),
    requirePureStudent,
    async (req, res) => {
      try {
        const userId = String(req.user.sub || '');
        const body = req.body || {};
        const payload = {
          phone: body.phone != null ? String(body.phone).slice(0, 64) : null,
          patronymic: body.patronymic != null ? String(body.patronymic).slice(0, 255) : null,
          academic_group:
            body.academic_group != null ? String(body.academic_group).slice(0, 255) : null,
          student_book_id:
            body.student_book_id != null ? String(body.student_book_id).slice(0, 128) : null
        };

        const existing = await StudentProfileChangeRequest.findOne({
          where: { user_id: userId, status: 'pending' }
        });
        if (existing) {
          return res.status(409).json({
            error: 'pending_exists',
            message:
              'У вас уже есть заявка на изменение данных. Дождитесь решения администратора.'
          });
        }

        const row = await StudentProfileChangeRequest.create({
          user_id: userId,
          payload,
          status: 'pending',
          created_at: new Date()
        });

        return res.status(201).json({ id: row.id, status: 'pending' });
      } catch (error) {
        console.error('Error profile change request:', error);
        return res.status(500).json({
          error: 'change_request_failed',
          message: 'Не удалось отправить заявку.'
        });
      }
    }
  );

  router.post(
    '/api/student/beginner-session/start',
    keycloakAuth.verifyToken(),
    requirePureStudent,
    async (req, res) => {
      try {
        const userId = String(req.user.sub || '');
        const row = await BeginnerScenarioSession.create({
          user_id: userId,
          started_at: new Date(),
          documents_count: 0
        });
        return res.status(201).json({
          id: row.id,
          startedAt: row.started_at
        });
      } catch (error) {
        console.error('Error beginner session start:', error);
        return res.status(500).json({
          error: 'beginner_session_start_failed',
          message: 'Не удалось начать учёт сессии.'
        });
      }
    }
  );

  router.post(
    '/api/student/beginner-session/:id/end',
    keycloakAuth.verifyToken(),
    requirePureStudent,
    async (req, res) => {
      try {
        const userId = String(req.user.sub || '');
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ error: 'bad_id' });
        }
        const row = await BeginnerScenarioSession.findOne({
          where: { id, user_id: userId }
        });
        if (!row) {
          return res.status(404).json({ error: 'not_found' });
        }
        if (row.ended_at) {
          return res.json({
            id: row.id,
            endedAt: row.ended_at,
            durationSeconds: row.duration_seconds,
            documentsCount: row.documents_count
          });
        }
        const ended = new Date();
        const started = new Date(row.started_at);
        const durationSeconds = Math.max(
          0,
          Math.floor((ended.getTime() - started.getTime()) / 1000)
        );
        const documentsCount = await countUserDocumentsBetween(userId, started, ended);
        await row.update({
          ended_at: ended,
          duration_seconds: durationSeconds,
          documents_count: documentsCount
        });
        return res.json({
          id: row.id,
          endedAt: ended,
          durationSeconds,
          documentsCount
        });
      } catch (error) {
        console.error('Error beginner session end:', error);
        return res.status(500).json({
          error: 'beginner_session_end_failed',
          message: 'Не удалось завершить учёт сессии.'
        });
      }
    }
  );

  router.post(
    '/api/student/reference-views/:docId',
    keycloakAuth.verifyToken(),
    requirePureStudent,
    async (req, res) => {
      try {
        const userId = String(req.user.sub || '');
        const docId = parseInt(req.params.docId, 10);
        if (Number.isNaN(docId)) {
          return res.status(400).json({ error: 'bad_id' });
        }
        const doc = await ReferenceDocument.findByPk(docId);
        if (!doc) {
          return res.status(404).json({ error: 'not_found' });
        }
        const now = new Date();
        const [row, created] = await ReferenceDocumentView.findOrCreate({
          where: { user_id: userId, reference_document_id: docId },
          defaults: {
            user_id: userId,
            reference_document_id: docId,
            first_viewed_at: now,
            last_viewed_at: now,
            view_count: 1
          }
        });
        if (!created) {
          await row.update({
            last_viewed_at: now,
            view_count: (Number(row.view_count) || 0) + 1
          });
        }
        return res.json({ ok: true });
      } catch (error) {
        console.error('Error reference view:', error);
        return res.status(500).json({
          error: 'reference_view_failed',
          message: 'Не удалось зафиксировать просмотр.'
        });
      }
    }
  );

  app.use(router);
}

function formatDuration(totalSec) {
  const s = Number(totalSec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${sec} с`;
  return `${sec} с`;
}

module.exports = {
  registerStudentRoutes
};
