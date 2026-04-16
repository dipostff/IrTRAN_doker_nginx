//-----------Подключаемые модули-----------//
const express = require('express');
const keycloakAuth = require('./../auth/keycloakAuth');
const {
  listUsers,
  getUserRealmRoles,
  createUserAccount,
  addRealmRolesToUser,
  removeRealmRolesFromUser
} = require('./../auth/keycloakAdmin');
const StudentProfile = require('./../../models/StudentProfile');
const StudentProfileChangeRequest = require('./../../models/StudentProfileChangeRequest');
//-----------Подключаемые модули-----------//

/**
 * Регистрация маршрутов панели управления (администратор тренажёра).
 *
 * Доступ только для роли app-admin.
 */
function registerAdminRoutes(app) {
  const router = express.Router();

  // Список пользователей с их ролями
  router.get(
    '/api/admin/users',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const users = await listUsers();
        const search = (req.query.q || '').toString().toLowerCase().trim();

        const enriched = [];
        for (const u of users) {
          // eslint-disable-next-line no-await-in-loop
          const roles = await getUserRealmRoles(u.id);
          const base = {
            id: u.id,
            username: u.username,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            roles
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
              // фильтрация по поисковой строке
              // eslint-disable-next-line no-continue
              continue;
            }
          }

          enriched.push(base);
        }

        return res.json(enriched);
      } catch (error) {
        console.error('Error listing admin users:', error.response?.data || error);
        return res.status(500).json({
          error: 'admin_users_failed',
          message: 'Не удалось получить список пользователей из Keycloak.'
        });
      }
    }
  );

  // Регистрация пользователя администратором
  router.post(
    '/api/admin/users',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const body = req.body || {};
        const email = String(body.email || '').trim().toLowerCase();
        const username = String(body.username || email).trim().toLowerCase();
        const password = String(body.password || '');
        const firstName = String(body.firstName || '').trim();
        const lastName = String(body.lastName || '').trim();
        const roles = Array.isArray(body.roles) ? body.roles.filter(Boolean) : ['student'];

        if (!email || !username || !password) {
          return res.status(400).json({
            error: 'bad_request',
            message: 'Необходимо указать email, username и пароль.'
          });
        }
        if (password.length < 6) {
          return res.status(400).json({
            error: 'bad_password',
            message: 'Пароль должен быть не короче 6 символов.'
          });
        }

        const created = await createUserAccount({
          email,
          username,
          password,
          firstName,
          lastName
        });

        if (roles.length) {
          await addRealmRolesToUser(created.id, roles);
        }

        const userRoles = await getUserRealmRoles(created.id);
        return res.status(201).json({
          id: created.id,
          username: created.username,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
          roles: userRoles
        });
      } catch (error) {
        const status = error?.response?.status;
        const errData = error?.response?.data;
        console.error('Error creating admin user:', errData || error);
        if (status === 409) {
          return res.status(409).json({
            error: 'already_exists',
            message: 'Пользователь с таким email/логином уже существует.'
          });
        }
        return res.status(500).json({
          error: 'admin_create_user_failed',
          message: 'Не удалось зарегистрировать пользователя.'
        });
      }
    }
  );

  // Управление ролями пользователя
  router.post(
    '/api/admin/users/:id/roles',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { add, remove } = req.body || {};

        if (!userId) {
          return res.status(400).json({
            error: 'user_id_required',
            message: 'Не указан идентификатор пользователя.'
          });
        }

        if (Array.isArray(add) && add.length > 0) {
          await addRealmRolesToUser(userId, add);
        }

        if (Array.isArray(remove) && remove.length > 0) {
          await removeRealmRolesFromUser(userId, remove);
        }

        const roles = await getUserRealmRoles(userId);

        return res.json({
          id: userId,
          roles
        });
      } catch (error) {
        console.error('Error updating user roles:', error.response?.data || error);
        return res.status(500).json({
          error: 'admin_roles_failed',
          message: 'Не удалось обновить роли пользователя.'
        });
      }
    }
  );

  // Заявки студентов на изменение дополнительных полей профиля (модерация)
  router.get(
    '/api/admin/student-profile-requests',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const status = (req.query.status || 'pending').toString();
        const where = {};
        if (status && status !== 'all') {
          where.status = status;
        }
        const rows = await StudentProfileChangeRequest.findAll({
          where,
          order: [['created_at', 'DESC']],
          limit: 200
        });
        const users = await listUsers();
        const byId = new Map(users.map((u) => [u.id, u]));
        const out = rows.map((r) => {
          const u = byId.get(r.user_id);
          return {
            id: r.id,
            userId: r.user_id,
            username: u?.username || null,
            email: u?.email || null,
            firstName: u?.firstName || null,
            lastName: u?.lastName || null,
            payload: r.payload,
            status: r.status,
            reviewComment: r.review_comment,
            reviewerUserId: r.reviewer_user_id,
            createdAt: r.created_at,
            reviewedAt: r.reviewed_at
          };
        });
        return res.json(out);
      } catch (error) {
        console.error('Error listing profile requests:', error);
        return res.status(500).json({
          error: 'profile_requests_failed',
          message: 'Не удалось загрузить заявки.'
        });
      }
    }
  );

  router.post(
    '/api/admin/student-profile-requests/:id/approve',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ error: 'bad_id' });
        }
        const reviewerId = String(req.user.sub || '');
        const row = await StudentProfileChangeRequest.findByPk(id);
        if (!row || row.status !== 'pending') {
          return res.status(404).json({
            error: 'not_found',
            message: 'Заявка не найдена или уже обработана.'
          });
        }
        const p = row.payload || {};
        const now = new Date();
        const [profile] = await StudentProfile.findOrCreate({
          where: { user_id: row.user_id },
          defaults: {
            user_id: row.user_id,
            created_at: now,
            updated_at: now
          }
        });
        await profile.update({
          phone: p.phone != null ? p.phone : profile.phone,
          patronymic: p.patronymic != null ? p.patronymic : profile.patronymic,
          academic_group: p.academic_group != null ? p.academic_group : profile.academic_group,
          student_book_id: p.student_book_id != null ? p.student_book_id : profile.student_book_id,
          updated_at: now
        });
        await row.update({
          status: 'approved',
          reviewer_user_id: reviewerId,
          reviewed_at: now,
          review_comment: (req.body && req.body.comment) || null
        });
        return res.json({ ok: true });
      } catch (error) {
        console.error('Error approve profile request:', error);
        return res.status(500).json({
          error: 'approve_failed',
          message: 'Не удалось применить заявку.'
        });
      }
    }
  );

  router.post(
    '/api/admin/student-profile-requests/:id/reject',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireRealmRole('app-admin'),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ error: 'bad_id' });
        }
        const reviewerId = String(req.user.sub || '');
        const row = await StudentProfileChangeRequest.findByPk(id);
        if (!row || row.status !== 'pending') {
          return res.status(404).json({
            error: 'not_found',
            message: 'Заявка не найдена или уже обработана.'
          });
        }
        await row.update({
          status: 'rejected',
          reviewer_user_id: reviewerId,
          reviewed_at: new Date(),
          review_comment: (req.body && req.body.comment) || null
        });
        return res.json({ ok: true });
      } catch (error) {
        console.error('Error reject profile request:', error);
        return res.status(500).json({
          error: 'reject_failed',
          message: 'Не удалось отклонить заявку.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerAdminRoutes
};
//-----------Экспортируемые модули-----------//

