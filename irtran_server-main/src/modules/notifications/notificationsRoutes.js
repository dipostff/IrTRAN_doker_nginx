const express = require('express');
const keycloakAuth = require('./../auth/keycloakAuth');
const {
  listUsers,
  getUserRealmRoles,
  listTeacherOwnedGroups,
  listAllTeacherGroups,
  listGroupMembers
} = require('./../auth/keycloakAdmin');
const Notification = require('./../../models/Notification');
const LearningDeadline = require('./../../models/LearningDeadline');
const Test = require('./../../models/Test');
const TestAttempt = require('./../../models/TestAttempt');
const Scenario = require('./../../models/Scenario');
const ScenarioView = require('./../../models/ScenarioView');

function getUserId(req) {
  const user = req.user || {};
  return user.sub || null;
}

function canManageNotifications(req) {
  return (
    keycloakAuth.hasRealmRole(req.user, 'teacher') ||
    keycloakAuth.hasRealmRole(req.user, 'app-admin')
  );
}

function isAppAdmin(req) {
  return keycloakAuth.hasRealmRole(req.user, 'app-admin');
}

function getRequesterUserId(req) {
  const u = req.user || {};
  return u.sub || null;
}

function normalizeType(type) {
  const allowed = new Set(['info', 'warning', 'deadline', 'success']);
  return allowed.has(type) ? type : 'info';
}

async function ensureNotification(userId, externalKey, payload) {
  const existing = await Notification.findOne({
    where: { user_id: userId, external_key: externalKey }
  });
  if (existing) return false;
  await Notification.create({
    ...payload,
    user_id: userId,
    external_key: externalKey,
    created_at: new Date(),
    updated_at: new Date()
  });
  return true;
}

function getBestPercent(list) {
  let best = null;
  for (const a of list) {
    const p = a.percent != null ? Number(a.percent) : null;
    if (p == null) continue;
    if (best == null || p > best) best = p;
  }
  return best;
}

async function generateAutomaticNotifications(userId) {
  const [tests, attempts, scenarios, views, deadlines] = await Promise.all([
    Test.findAll({ order: [['id', 'ASC']] }),
    TestAttempt.findAll({ where: { user_id: userId } }),
    Scenario.findAll({ order: [['id', 'ASC']] }),
    ScenarioView.findAll({ where: { user_id: userId } }),
    LearningDeadline.findAll({ where: { user_id: userId } })
  ]);

  const attemptsByTest = new Map();
  for (const a of attempts) {
    const arr = attemptsByTest.get(a.test_id) || [];
    arr.push(a);
    attemptsByTest.set(a.test_id, arr);
  }

  for (const t of tests) {
    const list = attemptsByTest.get(t.id) || [];
    const bestPercent = getBestPercent(list);
    const passThreshold =
      t.pass_percent != null && t.pass_percent !== '' ? Number(t.pass_percent) : null;
    const passed = bestPercent != null && passThreshold != null && bestPercent >= passThreshold;
    const maxAttempts = t.max_attempts != null && Number(t.max_attempts) > 0 ? Number(t.max_attempts) : null;
    const attemptsRemaining = maxAttempts != null ? Math.max(0, maxAttempts - list.length) : null;

    if (list.length === 0) continue;

    if (!passed && attemptsRemaining === 1) {
      await ensureNotification(userId, `auto:test:last_attempt:${t.id}`, {
        title: `Осталась последняя попытка: "${t.title || `#${t.id}`}"`,
        message: 'Перед следующей попыткой повторите материалы и пройдите сценарии.',
        type: 'warning',
        link: '/test-mode',
        deadline_at: null,
        is_read: false,
        created_by_user_id: 'system'
      });
    }

    if (!passed && attemptsRemaining === 0) {
      await ensureNotification(userId, `auto:test:attempts_over:${t.id}`, {
        title: `Попытки исчерпаны: "${t.title || `#${t.id}`}"`,
        message: 'Обратитесь к преподавателю для дополнительной попытки или консультации.',
        type: 'deadline',
        link: '/test-mode',
        deadline_at: new Date(),
        is_read: false,
        created_by_user_id: 'system'
      });
    }
  }

  const viewedSet = new Set((views || []).map((v) => Number(v.scenario_id)));
  const testsById = new Map((tests || []).map((t) => [Number(t.id), t]));
  const scenariosById = new Map((scenarios || []).map((s) => [Number(s.id), s]));
  const nowMs = Date.now();
  for (const dl of deadlines) {
    const et = String(dl.entity_type || '');
    const eid = Number(dl.entity_id);
    const deadlineAt = dl.deadline_at ? new Date(dl.deadline_at) : null;
    if (!deadlineAt || Number.isNaN(deadlineAt.getTime())) continue;
    const diffMs = deadlineAt.getTime() - nowMs;
    const overdue = diffMs < 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const near = !overdue && diffMs <= oneDayMs;

    if (et === 'test') {
      const t = testsById.get(eid);
      if (!t) continue;
      const list = attemptsByTest.get(eid) || [];
      const bestPercent = getBestPercent(list);
      const passThreshold =
        t.pass_percent != null && t.pass_percent !== '' ? Number(t.pass_percent) : null;
      const passed = bestPercent != null && passThreshold != null && bestPercent >= passThreshold;
      if (passed) continue;

      const key = overdue
        ? `auto:deadline:test:overdue:${dl.id}`
        : near
          ? `auto:deadline:test:today:${dl.id}`
          : `auto:deadline:test:set:${dl.id}`;
      const title = overdue
        ? `Просрочен срок по тесту "${t.title || `#${t.id}`}"` :
        near
          ? `Сегодня дедлайн по тесту "${t.title || `#${t.id}`}"` :
          `Назначен дедлайн по тесту "${t.title || `#${t.id}`}"`;
      const msg = dl.note
        ? `Комментарий преподавателя: ${dl.note}`
        : 'Рекомендуем завершить тест до указанного срока.';
      await ensureNotification(userId, key, {
        title,
        message: msg,
        type: overdue ? 'deadline' : 'warning',
        link: '/test-mode',
        deadline_at: deadlineAt,
        is_read: false,
        created_by_user_id: 'system'
      });
      if (overdue && dl.assigned_by_user_id) {
        await ensureNotification(String(dl.assigned_by_user_id), `auto:escalation:test:${dl.id}`, {
          title: `Просрочен срок у студента по тесту "${t.title || `#${t.id}`}"`,
          message: `Студент ${userId} не закрыл дедлайн по тесту. Проверьте прогресс и при необходимости скорректируйте сроки.`,
          type: 'warning',
          link: '/notifications',
          deadline_at: deadlineAt,
          is_read: false,
          created_by_user_id: 'system'
        });
      }
    }

    if (et === 'scenario') {
      const sc = scenariosById.get(eid);
      if (!sc) continue;
      if (viewedSet.has(eid)) continue;

      const key = overdue
        ? `auto:deadline:scenario:overdue:${dl.id}`
        : near
          ? `auto:deadline:scenario:today:${dl.id}`
          : `auto:deadline:scenario:set:${dl.id}`;
      const title = overdue
        ? `Просрочен срок ознакомления со сценарием "${sc.title || `#${sc.id}`}"` :
        near
          ? `Сегодня дедлайн ознакомления со сценарием "${sc.title || `#${sc.id}`}"` :
          `Назначен срок ознакомления со сценарием "${sc.title || `#${sc.id}`}"`;
      const msg = dl.note
        ? `Комментарий преподавателя: ${dl.note}`
        : 'Ознакомьтесь со сценарием до указанного срока.';
      await ensureNotification(userId, key, {
        title,
        message: msg,
        type: overdue ? 'deadline' : 'info',
        link: '/scenarios',
        deadline_at: deadlineAt,
        is_read: false,
        created_by_user_id: 'system'
      });
      if (overdue && dl.assigned_by_user_id) {
        await ensureNotification(String(dl.assigned_by_user_id), `auto:escalation:scenario:${dl.id}`, {
          title: `Просрочен срок ознакомления со сценарием "${sc.title || `#${sc.id}`}"`,
          message: `Студент ${userId} не ознакомился со сценарием в срок. Проверьте прогресс и при необходимости свяжитесь со студентом.`,
          type: 'warning',
          link: '/notifications',
          deadline_at: deadlineAt,
          is_read: false,
          created_by_user_id: 'system'
        });
      }
    }
  }
}

function registerNotificationsRoutes(app) {
  const router = express.Router();

  router.get('/api/notifications', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      await generateAutomaticNotifications(userId);
      const unreadOnly = String(req.query.unreadOnly || '') === '1';
      const where = unreadOnly ? { user_id: userId, is_read: false } : { user_id: userId };
      const rows = await Notification.findAll({
        where,
        order: [
          ['is_read', 'ASC'],
          ['deadline_at', 'ASC'],
          ['created_at', 'DESC']
        ]
      });
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/notifications', error);
      return res.status(500).json({
        error: 'notifications_list_failed',
        message: 'Не удалось загрузить уведомления.'
      });
    }
  });

  router.patch('/api/notifications/:id/read', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id, 10);
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await Notification.findOne({ where: { id, user_id: userId } });
      if (!row) return res.status(404).json({ error: 'not_found' });
      await row.update({
        is_read: true,
        read_at: row.read_at || new Date(),
        updated_at: new Date()
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error('PATCH /api/notifications/:id/read', error);
      return res.status(500).json({
        error: 'notification_read_failed',
        message: 'Не удалось обновить уведомление.'
      });
    }
  });

  router.patch('/api/notifications/read-all', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      await Notification.update(
        { is_read: true, read_at: new Date(), updated_at: new Date() },
        { where: { user_id: userId, is_read: false } }
      );
      return res.json({ ok: true });
    } catch (error) {
      console.error('PATCH /api/notifications/read-all', error);
      return res.status(500).json({
        error: 'notifications_read_all_failed',
        message: 'Не удалось отметить уведомления.'
      });
    }
  });

  router.get('/api/notifications/student-users', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const users = await listUsers();
      const students = [];
      for (const u of users) {
        // eslint-disable-next-line no-await-in-loop
        const roles = await getUserRealmRoles(u.id);
        if (!roles.includes('student')) continue;
        students.push({
          id: u.id,
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName
        });
      }
      return res.json(students);
    } catch (error) {
      console.error('GET /api/notifications/student-users', error);
      return res.status(500).json({
        error: 'notifications_users_failed',
        message: 'Не удалось получить список студентов.'
      });
    }
  });

  router.get('/api/notifications/groups', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const requesterId = getRequesterUserId(req);
      if (!requesterId) return res.status(401).json({ error: 'unauthorized' });
      const groups = isAppAdmin(req)
        ? await listAllTeacherGroups()
        : await listTeacherOwnedGroups(requesterId);
      return res.json(groups || []);
    } catch (error) {
      console.error('GET /api/notifications/groups', error);
      return res.status(500).json({
        error: 'notifications_groups_failed',
        message: 'Не удалось загрузить группы.'
      });
    }
  });

  router.get('/api/notifications/catalog', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const [tests, scenarios] = await Promise.all([
        Test.findAll({ attributes: ['id', 'title'], order: [['id', 'ASC']] }),
        Scenario.findAll({ attributes: ['id', 'title'], order: [['id', 'ASC']] })
      ]);
      return res.json({ tests, scenarios });
    } catch (error) {
      console.error('GET /api/notifications/catalog', error);
      return res.status(500).json({
        error: 'notifications_catalog_failed',
        message: 'Не удалось загрузить справочник тестов/сценариев.'
      });
    }
  });

  router.get('/api/learning-deadlines', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const userId = String(req.query.userId || '');
      const where = userId ? { user_id: userId } : {};
      const rows = await LearningDeadline.findAll({
        where,
        order: [['deadline_at', 'ASC']]
      });
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/learning-deadlines', error);
      return res.status(500).json({
        error: 'deadlines_list_failed',
        message: 'Не удалось загрузить дедлайны.'
      });
    }
  });

  router.post('/api/learning-deadlines', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const body = req.body || {};
      const userId = body.userId ? String(body.userId) : '';
      const entityType = String(body.entityType || '');
      const entityId = parseInt(body.entityId, 10);
      const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null;
      const note = body.note != null ? String(body.note).trim() : null;
      if (!userId) return res.status(400).json({ error: 'user_required', message: 'Укажите студента.' });
      if (!['test', 'scenario'].includes(entityType)) {
        return res.status(400).json({ error: 'bad_entity_type', message: 'entityType должен быть test или scenario.' });
      }
      if (Number.isNaN(entityId)) return res.status(400).json({ error: 'bad_entity_id' });
      if (!deadlineAt || Number.isNaN(deadlineAt.getTime())) {
        return res.status(400).json({ error: 'bad_deadline', message: 'Некорректный дедлайн.' });
      }
      if (entityType === 'test') {
        const t = await Test.findByPk(entityId);
        if (!t) return res.status(404).json({ error: 'test_not_found' });
      } else {
        const s = await Scenario.findByPk(entityId);
        if (!s) return res.status(404).json({ error: 'scenario_not_found' });
      }
      const now = new Date();
      const [row, created] = await LearningDeadline.findOrCreate({
        where: { user_id: userId, entity_type: entityType, entity_id: entityId },
        defaults: {
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
          deadline_at: deadlineAt,
          note,
          assigned_by_user_id: getUserId(req),
          created_at: now,
          updated_at: now
        }
      });
      if (!created) {
        await row.update({
          deadline_at: deadlineAt,
          note,
          assigned_by_user_id: getUserId(req),
          updated_at: now
        });
      }
      return res.status(created ? 201 : 200).json(row);
    } catch (error) {
      console.error('POST /api/learning-deadlines', error);
      return res.status(500).json({
        error: 'deadlines_create_failed',
        message: 'Не удалось сохранить дедлайн.'
      });
    }
  });

  router.post('/api/learning-deadlines/by-group', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const requesterId = getRequesterUserId(req);
      if (!requesterId) return res.status(401).json({ error: 'unauthorized' });
      const body = req.body || {};
      const groupId = String(body.groupId || '');
      const entityType = String(body.entityType || '');
      const entityId = parseInt(body.entityId, 10);
      const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null;
      const note = body.note != null ? String(body.note).trim() : null;
      if (!groupId) return res.status(400).json({ error: 'group_required', message: 'Укажите группу.' });
      if (!['test', 'scenario'].includes(entityType)) {
        return res.status(400).json({ error: 'bad_entity_type', message: 'entityType должен быть test или scenario.' });
      }
      if (Number.isNaN(entityId)) return res.status(400).json({ error: 'bad_entity_id' });
      if (!deadlineAt || Number.isNaN(deadlineAt.getTime())) {
        return res.status(400).json({ error: 'bad_deadline', message: 'Некорректный дедлайн.' });
      }

      if (entityType === 'test') {
        const t = await Test.findByPk(entityId);
        if (!t) return res.status(404).json({ error: 'test_not_found' });
      } else {
        const s = await Scenario.findByPk(entityId);
        if (!s) return res.status(404).json({ error: 'scenario_not_found' });
      }

      if (!isAppAdmin(req)) {
        const owned = await listTeacherOwnedGroups(requesterId);
        if (!(owned || []).some((g) => String(g.id) === groupId)) {
          return res.status(403).json({ error: 'forbidden', message: 'Нет доступа к выбранной группе.' });
        }
      }

      const members = await listGroupMembers(groupId);
      const studentIds = [];
      for (const m of members || []) {
        // eslint-disable-next-line no-await-in-loop
        const roles = await getUserRealmRoles(m.id);
        if (roles.includes('student')) {
          studentIds.push(String(m.id));
        }
      }
      if (!studentIds.length) {
        return res.status(400).json({ error: 'no_students', message: 'В группе нет студентов.' });
      }

      const now = new Date();
      let created = 0;
      let updated = 0;
      for (const userId of studentIds) {
        // eslint-disable-next-line no-await-in-loop
        const [row, isCreated] = await LearningDeadline.findOrCreate({
          where: { user_id: userId, entity_type: entityType, entity_id: entityId },
          defaults: {
            user_id: userId,
            entity_type: entityType,
            entity_id: entityId,
            deadline_at: deadlineAt,
            note,
            assigned_by_user_id: requesterId,
            created_at: now,
            updated_at: now
          }
        });
        if (isCreated) {
          created += 1;
        } else {
          // eslint-disable-next-line no-await-in-loop
          await row.update({
            deadline_at: deadlineAt,
            note,
            assigned_by_user_id: requesterId,
            updated_at: now
          });
          updated += 1;
        }
      }
      return res.status(201).json({ created, updated, totalStudents: studentIds.length });
    } catch (error) {
      console.error('POST /api/learning-deadlines/by-group', error);
      return res.status(500).json({
        error: 'deadlines_group_create_failed',
        message: 'Не удалось назначить дедлайн группе.'
      });
    }
  });

  router.delete('/api/learning-deadlines/:id', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) return res.status(403).json({ error: 'forbidden' });
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'bad_id' });
      const row = await LearningDeadline.findByPk(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      await row.destroy();
      return res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /api/learning-deadlines/:id', error);
      return res.status(500).json({
        error: 'deadlines_delete_failed',
        message: 'Не удалось удалить дедлайн.'
      });
    }
  });

  router.post('/api/notifications', keycloakAuth.verifyToken(), async (req, res) => {
    try {
      if (!canManageNotifications(req)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const body = req.body || {};
      const userIds = Array.isArray(body.userIds) ? body.userIds.map((x) => String(x)) : [];
      const title = body.title ? String(body.title).trim() : '';
      const message = body.message != null ? String(body.message).trim() : null;
      const type = normalizeType(String(body.type || 'info'));
      const link = body.link ? String(body.link).trim() : null;
      const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null;
      const creator = getUserId(req);

      if (!userIds.length) {
        return res.status(400).json({ error: 'user_ids_required', message: 'Выберите студентов.' });
      }
      if (!title) {
        return res.status(400).json({ error: 'title_required', message: 'Укажите заголовок.' });
      }
      if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
        return res.status(400).json({ error: 'bad_deadline', message: 'Некорректный дедлайн.' });
      }

      const now = new Date();
      const created = await Notification.bulkCreate(
        userIds.map((uid) => ({
          user_id: uid,
          title,
          message,
          type,
          link,
          deadline_at: deadlineAt,
          is_read: false,
          created_by_user_id: creator,
          external_key: null,
          created_at: now,
          updated_at: now
        }))
      );

      return res.status(201).json({ created: created.length });
    } catch (error) {
      console.error('POST /api/notifications', error);
      return res.status(500).json({
        error: 'notifications_create_failed',
        message: 'Не удалось создать уведомления.'
      });
    }
  });

  app.use(router);
}

module.exports = {
  registerNotificationsRoutes
};
