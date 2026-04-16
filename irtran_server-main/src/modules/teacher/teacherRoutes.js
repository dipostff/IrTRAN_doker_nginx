//-----------Подключаемые модули-----------//
const express = require('express');
const keycloakAuth = require('./../auth/keycloakAuth');
const { Op } = require('sequelize');
const {
  listUsers,
  getUserRealmRoles,
  listTeacherOwnedGroups,
  createTeacherOwnedGroup,
  listAllTeacherGroups,
  listGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
  deleteGroup
} = require('./../auth/keycloakAdmin');
const Test = require('./../../models/Test');
const TestAttempt = require('./../../models/TestAttempt');
const Scenario = require('./../../models/Scenario');
const ScenarioView = require('./../../models/ScenarioView');
const TrainingScenarioSnapshot = require('./../../models/TrainingScenarioSnapshot');
//-----------Подключаемые модули-----------//

/**
 * Регистрация маршрутов панели преподавателя.
 */
function registerTeacherRoutes(app) {
  const router = express.Router();

  function getRequesterUserId(req) {
    const user = req.user || {};
    return user.sub || null;
  }

  function isAppAdmin(req) {
    return keycloakAuth.hasRealmRole(req.user, 'app-admin');
  }

  function resolveOwnerTeacherId(req) {
    const requesterId = getRequesterUserId(req);
    if (!requesterId) return null;
    if (isAppAdmin(req) && req.query.ownerTeacherId) {
      return String(req.query.ownerTeacherId);
    }
    return requesterId;
  }

  async function assertGroupOwnedByTeacher(groupId, ownerTeacherId) {
    const owned = await listTeacherOwnedGroups(ownerTeacherId);
    const ok = owned.some((g) => g.id === groupId);
    if (!ok) {
      const err = new Error('group_not_owned');
      err.statusCode = 403;
      throw err;
    }
  }

  // Фиксация попытки прохождения теста (доступен всем авторизованным)
  router.post(
    '/api/tests/:id/attempts',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const testId = parseInt(req.params.id, 10);
        if (Number.isNaN(testId)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста.'
          });
        }

        const {
          correctAnswers,
          questionCount,
          earnedPoints,
          maxPoints
        } = req.body || {};
        if (
          typeof correctAnswers !== 'number' ||
          typeof questionCount !== 'number' ||
          questionCount <= 0
        ) {
          return res.status(400).json({
            error: 'bad_payload',
            message: 'Некорректные данные по результатам теста.'
          });
        }

        const test = await Test.findByPk(testId);
        if (!test) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Тест не найден.'
          });
        }

        const user = req.user || {};
        const userId = user.sub || null;
        const username = user.preferred_username || user.username || null;
        let percent = (correctAnswers / questionCount) * 100;
        if (
          typeof earnedPoints === 'number' &&
          typeof maxPoints === 'number' &&
          maxPoints > 0
        ) {
          percent = (earnedPoints / maxPoints) * 100;
        }

        await TestAttempt.create({
          test_id: testId,
          user_id: userId,
          username,
          correct_answers: correctAnswers,
          question_count: questionCount,
          percent,
          created_at: new Date()
        });

        return res.status(201).json({ status: 'ok' });
      } catch (error) {
        console.error('Error saving test attempt:', error);
        return res.status(500).json({
          error: 'attempt_failed',
          message: 'Не удалось сохранить результат теста.'
        });
      }
    }
  );

  // Группы преподавателя (Keycloak Groups)
  router.get(
    '/api/teacher/groups',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) {
          return res.status(401).json({ error: 'unauthorized' });
        }
        if (isAppAdmin(req) && req.query.all === '1') {
          const all = await listAllTeacherGroups();
          return res.json(all);
        }
        const groups = await listTeacherOwnedGroups(ownerTeacherId);
        return res.json(groups);
      } catch (error) {
        console.error('Error listing teacher groups:', error.response?.data || error);
        return res.status(500).json({
          error: 'groups_failed',
          message: 'Не удалось получить список групп.'
        });
      }
    }
  );

  router.post(
    '/api/teacher/groups',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) {
          return res.status(401).json({ error: 'unauthorized' });
        }
        const name = String(req.body?.name || '').trim();
        if (!name) {
          return res.status(400).json({ error: 'name_required', message: 'Не указано имя группы.' });
        }
        const created = await createTeacherOwnedGroup(ownerTeacherId, name);
        return res.status(201).json(created);
      } catch (error) {
        console.error('Error creating teacher group:', error.response?.data || error);
        return res.status(500).json({
          error: 'group_create_failed',
          message: 'Не удалось создать группу.'
        });
      }
    }
  );

  router.delete(
    '/api/teacher/groups/:groupId',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }
        await deleteGroup(groupId);
        return res.json({ ok: true });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error deleting group:', error.response?.data || error);
        return res.status(status).json({
          error: 'group_delete_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось удалить группу.'
        });
      }
    }
  );

  router.get(
    '/api/teacher/groups/:groupId/members',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }
        const members = await listGroupMembers(groupId);
        const result = (members || []).map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName
        }));
        return res.json(result);
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error listing group members:', error.response?.data || error);
        return res.status(status).json({
          error: 'group_members_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось получить участников группы.'
        });
      }
    }
  );

  router.post(
    '/api/teacher/groups/:groupId/members',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }
        const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
        if (!studentIds.length) {
          return res.status(400).json({
            error: 'student_ids_required',
            message: 'Не передан список студентов.'
          });
        }
        for (const id of studentIds) {
          // eslint-disable-next-line no-await-in-loop
          await addUserToGroup(String(id), groupId);
        }
        return res.status(201).json({ ok: true });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error adding group members:', error.response?.data || error);
        return res.status(status).json({
          error: 'group_members_add_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось добавить участников.'
        });
      }
    }
  );

  router.delete(
    '/api/teacher/groups/:groupId/members/:studentId',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }
        await removeUserFromGroup(String(req.params.studentId), groupId);
        return res.json({ ok: true });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error removing group member:', error.response?.data || error);
        return res.status(status).json({
          error: 'group_members_remove_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось удалить участника.'
        });
      }
    }
  );

  // Успеваемость группы: агрегаты + статусы по студентам
  router.get(
    '/api/teacher/groups/:groupId/performance',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }

        const members = (await listGroupMembers(groupId)) || [];
        const memberBases = members.map((u) => ({
          userId: u.id,
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName
        }));
        const memberIds = memberBases.map((m) => m.userId).filter(Boolean);

        const [tests, scenarios] = await Promise.all([
          Test.findAll(),
          Scenario.findAll()
        ]);

        const attempts = memberIds.length
          ? await TestAttempt.findAll({
              where: { user_id: { [Op.in]: memberIds } }
            })
          : [];

        // best per (test_id, user_id)
        const attemptsByTestUser = new Map();
        for (const a of attempts) {
          const key = `${a.test_id}::${a.user_id}`;
          const arr = attemptsByTestUser.get(key) || [];
          arr.push(a);
          attemptsByTestUser.set(key, arr);
        }

        const testsOut = tests.map((t) => {
          const passPercent = t.pass_percent != null ? Number(t.pass_percent) : null;
          const students = memberBases.map((m) => {
            const key = `${t.id}::${m.userId}`;
            const arr = attemptsByTestUser.get(key) || [];
            if (!arr.length) {
              return { ...m, bestPercent: null, attempts: 0, status: 'not_attempted' };
            }
            let best = arr[0];
            for (const a of arr) {
              if (Number(a.percent) > Number(best.percent)) best = a;
            }
            const bestPercent = best.percent != null ? Number(best.percent) : 0;
            let status = 'attempted';
            if (passPercent != null) {
              status = bestPercent >= passPercent ? 'passed' : 'failed';
            }
            return { ...m, bestPercent, attempts: arr.length, status };
          });

          const membersTotal = memberBases.length;
          const attempted = students.filter((s) => s.attempts > 0).length;
          const passed = students.filter((s) => s.status === 'passed').length;
          const failed = students.filter((s) => s.status === 'failed').length;
          const notAttempted = membersTotal - attempted;
          const avgBestPercent =
            attempted > 0
              ? students
                  .filter((s) => s.attempts > 0)
                  .reduce((sum, s) => sum + (Number(s.bestPercent) || 0), 0) / attempted
              : 0;

          return {
            testId: t.id,
            title: t.title,
            passPercent,
            summary: {
              membersTotal,
              attempted,
              passed,
              failed,
              notAttempted,
              avgBestPercent: Number(avgBestPercent.toFixed(1))
            },
            students
          };
        });

        const views = memberIds.length
          ? await ScenarioView.findAll({
              where: { user_id: { [Op.in]: memberIds } }
            })
          : [];
        const viewsByScenarioUser = new Map();
        for (const v of views) {
          const key = `${v.scenario_id}::${v.user_id}`;
          const arr = viewsByScenarioUser.get(key) || [];
          arr.push(v);
          viewsByScenarioUser.set(key, arr);
        }

        const scenariosOut = scenarios.map((sc) => {
          const students = memberBases.map((m) => {
            const key = `${sc.id}::${m.userId}`;
            const arr = viewsByScenarioUser.get(key) || [];
            if (!arr.length) return { ...m, viewed: false, firstViewedAt: null, lastViewedAt: null };
            let first = arr[0].first_viewed_at;
            let last = arr[0].last_viewed_at;
            for (const v of arr) {
              if (v.first_viewed_at && (!first || v.first_viewed_at < first)) first = v.first_viewed_at;
              if (v.last_viewed_at && (!last || v.last_viewed_at > last)) last = v.last_viewed_at;
            }
            return { ...m, viewed: true, firstViewedAt: first, lastViewedAt: last };
          });
          const membersTotal = memberBases.length;
          const viewedCount = students.filter((s) => s.viewed).length;
          const notViewed = membersTotal - viewedCount;
          const viewedPercent = membersTotal > 0 ? (viewedCount / membersTotal) * 100 : 0;
          return {
            scenarioId: sc.id,
            title: sc.title,
            summary: {
              membersTotal,
              viewed: viewedCount,
              notViewed,
              viewedPercent: Number(viewedPercent.toFixed(1))
            },
            students
          };
        });

        return res.json({
          group: { id: groupId },
          members: memberBases,
          tests: testsOut,
          scenarios: scenariosOut
        });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error building group performance:', error.response?.data || error);
        return res.status(status).json({
          error: 'group_performance_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось получить успеваемость группы.'
        });
      }
    }
  );

  // Список студентов (через Keycloak Admin API)
  router.get(
    '/api/teacher/students',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const users = await listUsers();
        const search = (req.query.q || '').toString().toLowerCase().trim();
        const students = [];

        for (const u of users) {
          // eslint-disable-next-line no-await-in-loop
          const roles = await getUserRealmRoles(u.id);
          if (!roles.includes('student')) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const base = {
            id: u.id,
            username: u.username,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName
          };

          if (search) {
            const haystack = [
              u.username || '',
              u.email || '',
              u.firstName || '',
              u.lastName || ''
            ]
              .join(' ')
              .toLowerCase();
            if (!haystack.includes(search)) {
              // eslint-disable-next-line no-continue
              continue;
            }
          }

          students.push(base);
        }

        return res.json(students);
      } catch (error) {
        console.error('Error listing students:', error.response?.data || error);
        return res.status(500).json({
          error: 'students_failed',
          message: 'Не удалось получить список студентов.'
        });
      }
    }
  );

  // Агрегированная статистика по тестам
  router.get(
    '/api/teacher/tests/results',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const testIdFilter = req.query.testId
          ? parseInt(req.query.testId, 10)
          : null;

        const whereTest = {};
        if (testIdFilter && !Number.isNaN(testIdFilter)) {
          whereTest.id = testIdFilter;
        }

        const tests = await Test.findAll({ where: whereTest });
        const results = [];

        for (const test of tests) {
          // eslint-disable-next-line no-await-in-loop
          const attempts = await TestAttempt.findAll({
            where: { test_id: test.id }
          });

          const byUser = new Map();
          for (const a of attempts) {
            const key = a.user_id || a.username || 'unknown';
            const existing = byUser.get(key);
            if (!existing) {
              byUser.set(key, {
                userId: a.user_id,
                username: a.username,
                bestPercent: a.percent,
                attemptsCount: 1,
                lastAttemptAt: a.created_at
              });
            } else {
              existing.attemptsCount += 1;
              if (a.percent > existing.bestPercent) {
                existing.bestPercent = a.percent;
              }
              if (a.created_at > existing.lastAttemptAt) {
                existing.lastAttemptAt = a.created_at;
              }
            }
          }

          results.push({
            testId: test.id,
            testTitle: test.title,
            students: Array.from(byUser.values())
          });
        }

        return res.json(results);
      } catch (error) {
        console.error('Error getting test results:', error);
        return res.status(500).json({
          error: 'test_results_failed',
          message: 'Не удалось получить результаты тестов.'
        });
      }
    }
  );

  // Фиксация просмотра сценария студентом
  router.post(
    '/api/scenarios/:id/view',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const scenarioId = parseInt(req.params.id, 10);
        if (Number.isNaN(scenarioId)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор сценария.'
          });
        }

        const scenario = await Scenario.findByPk(scenarioId);
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

        let record = await ScenarioView.findOne({
          where: {
            scenario_id: scenarioId,
            user_id: userId
          }
        });

        if (!record) {
          record = await ScenarioView.create({
            scenario_id: scenarioId,
            user_id: userId,
            username,
            first_viewed_at: now,
            last_viewed_at: now,
            completed: false
          });
        } else {
          record.last_viewed_at = now;
          await record.save();
        }

        return res.status(201).json({ status: 'ok' });
      } catch (error) {
        console.error('Error saving scenario view:', error);
        return res.status(500).json({
          error: 'scenario_view_failed',
          message: 'Не удалось сохранить просмотр сценария.'
        });
      }
    }
  );

  // Сводка по просмотрам сценариев
  router.get(
    '/api/teacher/scenarios/views',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const scenarios = await Scenario.findAll();
        const data = [];

        for (const sc of scenarios) {
          // eslint-disable-next-line no-await-in-loop
          const views = await ScenarioView.findAll({
            where: { scenario_id: sc.id }
          });

          const byUser = new Map();
          for (const v of views) {
            const key = v.user_id || v.username || 'unknown';
            const existing = byUser.get(key);
            if (!existing) {
              byUser.set(key, {
                userId: v.user_id,
                username: v.username,
                viewed: true,
                firstViewedAt: v.first_viewed_at,
                lastViewedAt: v.last_viewed_at,
                completed: v.completed
              });
            } else {
              if (v.first_viewed_at < existing.firstViewedAt) {
                existing.firstViewedAt = v.first_viewed_at;
              }
              if (v.last_viewed_at > existing.lastViewedAt) {
                existing.lastViewedAt = v.last_viewed_at;
              }
              existing.completed = existing.completed || v.completed;
            }
          }

          data.push({
            scenarioId: sc.id,
            title: sc.title,
            students: Array.from(byUser.values())
          });
        }

        return res.json(data);
      } catch (error) {
        console.error('Error getting scenario views:', error);
        return res.status(500).json({
          error: 'scenario_views_failed',
          message: 'Не удалось получить статистику по сценариям.'
        });
      }
    }
  );

  // Профиль студента: результаты по тестам и сценариям
  router.get(
    '/api/teacher/students/:id/profile',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const userId = req.params.id;
        if (!userId) {
          return res.status(400).json({
            error: 'user_id_required',
            message: 'Не указан идентификатор пользователя.'
          });
        }

        const users = await listUsers();
        const user = users.find((u) => u.id === userId);
        if (!user) {
          return res.status(404).json({
            error: 'user_not_found',
            message: 'Пользователь не найден в Keycloak.'
          });
        }

        const tests = await Test.findAll();
        const attempts = await TestAttempt.findAll({
          where: { user_id: userId }
        });

        const attemptsByTest = new Map();
        for (const a of attempts) {
          const arr = attemptsByTest.get(a.test_id) || [];
          arr.push(a);
          attemptsByTest.set(a.test_id, arr);
        }

        const testsSummary = tests.map((t) => {
          const aList = attemptsByTest.get(t.id) || [];
          if (!aList.length) {
            return {
              testId: t.id,
              title: t.title,
              passed: false,
              attemptsCount: 0,
              bestCorrectAnswers: 0,
              bestWrongAnswers: 0,
              bestPercent: 0
            };
          }
          let best = aList[0];
          for (const a of aList) {
            if (a.percent > best.percent) best = a;
          }
          const bestCorrect = best.correct_answers || 0;
          const bestTotal = best.question_count || 0;
          const bestWrong =
            bestTotal > bestCorrect ? bestTotal - bestCorrect : 0;
          return {
            testId: t.id,
            title: t.title,
            passed: true,
            attemptsCount: aList.length,
            bestCorrectAnswers: bestCorrect,
            bestWrongAnswers: bestWrong,
            bestPercent: best.percent || 0
          };
        });

        const scenarios = await Scenario.findAll();
        const views = await ScenarioView.findAll({
          where: { user_id: userId }
        });
        const viewsByScenario = new Map();
        for (const v of views) {
          const arr = viewsByScenario.get(v.scenario_id) || [];
          arr.push(v);
          viewsByScenario.set(v.scenario_id, arr);
        }

        const scenariosSummary = scenarios.map((sc) => {
          const vList = viewsByScenario.get(sc.id) || [];
          if (!vList.length) {
            return {
              scenarioId: sc.id,
              title: sc.title,
              viewed: false,
              firstViewedAt: null,
              lastViewedAt: null
            };
          }
          let first = vList[0].first_viewed_at;
          let last = vList[0].last_viewed_at;
          for (const v of vList) {
            if (v.first_viewed_at < first) first = v.first_viewed_at;
            if (v.last_viewed_at > last) last = v.last_viewed_at;
          }
          return {
            scenarioId: sc.id,
            title: sc.title,
            viewed: true,
            firstViewedAt: first,
            lastViewedAt: last
          };
        });

        return res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          tests: testsSummary,
          scenarios: scenariosSummary
        });
      } catch (error) {
        console.error('Error getting student profile:', error);
        return res.status(500).json({
          error: 'student_profile_failed',
          message: 'Не удалось получить профиль студента.'
        });
      }
    }
  );

  // Прогресс учебных сценариев (тренажёр документов): сохранение со стороны студента
  router.post(
    '/api/training/scenario-progress',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const user = req.user || {};
        const userId = user.sub;
        if (!userId) return res.status(401).json({ error: 'unauthorized' });

        const { docType, docRef, doneCount, totalCount, doneStepIds } = req.body || {};
        if (!docType || docRef === undefined || docRef === null) {
          return res.status(400).json({
            error: 'bad_payload',
            message: 'Укажите docType и docRef.'
          });
        }

        const refStr = String(docRef).slice(0, 191);
        const uname = user.preferred_username || user.username || null;
        const dc = Math.max(0, parseInt(String(doneCount), 10) || 0);
        const tc = Math.max(0, parseInt(String(totalCount), 10) || 0);
        const ids = Array.isArray(doneStepIds) ? doneStepIds.map((x) => String(x)) : [];

        const [row] = await TrainingScenarioSnapshot.findOrCreate({
          where: {
            user_id: String(userId),
            doc_type: String(docType).slice(0, 64),
            doc_ref: refStr
          },
          defaults: {
            username: uname,
            done_count: dc,
            total_count: tc,
            done_step_ids: ids
          }
        });

        await row.update({
          username: uname || row.username,
          done_count: dc,
          total_count: tc,
          done_step_ids: ids
        });

        return res.json({ ok: true });
      } catch (error) {
        console.error('Error saving training scenario progress:', error);
        return res.status(500).json({
          error: 'training_progress_save_failed',
          message: 'Не удалось сохранить прогресс сценария.'
        });
      }
    }
  );

  // Сводка прогресса тренажёра по группе (последний снимок на пару user + тип документа)
  router.get(
    '/api/teacher/groups/:groupId/training-scenario-progress',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const ownerTeacherId = resolveOwnerTeacherId(req);
        if (!ownerTeacherId) return res.status(401).json({ error: 'unauthorized' });
        const groupId = req.params.groupId;
        if (!isAppAdmin(req)) {
          await assertGroupOwnedByTeacher(groupId, ownerTeacherId);
        }

        const members = (await listGroupMembers(groupId)) || [];
        const memberBases = members.map((u) => ({
          userId: u.id,
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName
        }));
        const memberIds = memberBases.map((m) => m.userId).filter(Boolean);

        if (!memberIds.length) {
          return res.json({ group: { id: groupId }, students: [] });
        }

        const snaps = await TrainingScenarioSnapshot.findAll({
          where: { user_id: { [Op.in]: memberIds } },
          order: [['updated_at', 'DESC']]
        });

        const latestByUserDoc = new Map();
        for (const s of snaps) {
          const key = `${s.user_id}::${s.doc_type}`;
          if (!latestByUserDoc.has(key)) {
            latestByUserDoc.set(key, s);
          }
        }

        const students = memberBases.map((m) => {
          const progress = {};
          for (const [key, snap] of latestByUserDoc) {
            if (!key.startsWith(`${m.userId}::`)) continue;
            const docType = key.split('::')[1];
            const total = Number(snap.total_count) || 0;
            const done = Number(snap.done_count) || 0;
            progress[docType] = {
              docRef: snap.doc_ref,
              doneCount: done,
              totalCount: total,
              percent: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
              updatedAt: snap.updated_at
            };
          }
          return { ...m, progress };
        });

        return res.json({ group: { id: groupId }, students });
      } catch (error) {
        const status = error.statusCode || 500;
        console.error('Error training scenario group progress:', error.response?.data || error);
        return res.status(status).json({
          error: 'training_group_progress_failed',
          message: status === 403 ? 'Нет доступа к группе.' : 'Не удалось получить прогресс тренажёра.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerTeacherRoutes
};
//-----------Экспортируемые модули-----------//

