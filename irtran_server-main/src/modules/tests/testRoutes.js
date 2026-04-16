//-----------Подключаемые модули-----------//
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const keycloakAuth = require('./../auth/keycloakAuth');
const Question = require('./../../models/Question');
const Test = require('./../../models/Test');
const TestVariant = require('./../../models/TestVariant');
const TestVariantQuestion = require('./../../models/TestVariantQuestion');
const TestQuestion = require('./../../models/TestQuestion');
const TestAttempt = require('./../../models/TestAttempt');
const sequelize = require('./../sequelize/db');
//-----------Подключаемые модули-----------//

const questionsUploadDir =
  process.env.QUESTIONS_UPLOAD_DIR ||
  path.join(__dirname, '../../../uploads/questions');

if (!fs.existsSync(questionsUploadDir)) {
  fs.mkdirSync(questionsUploadDir, { recursive: true });
}

const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, questionsUploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, unique + ext);
  }
});

const uploadQuestionImage = multer({
  storage: questionImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP).'));
    }
  }
});

function buildSurveyQuestionFromModel(question, points) {
  const base = {
    name: question.code || `q_${question.id}`,
    title: question.text,
    type: question.type || 'radiogroup'
  };

  if (question.options) {
    base.choices = question.options;
  }

  if (question.correct_answer !== undefined && question.correct_answer !== null) {
    base.correctAnswer = question.correct_answer;
  }

  if (question.image_path) {
    base.imagePath = `/api/questions/${question.id}/image`;
  }

  if (points != null) {
    base.points = points;
  }

  return base;
}

async function buildSurveySchemaForTest(test, options = {}) {
  const { variantId, shuffleSingle } = options;

  let questions = [];
  let variantQuestions = [];
  let testQuestions = [];

  if (test.variant_mode === 'per_variant') {
    let variant;
    if (variantId) {
      variant = await TestVariant.findOne({
        where: { id: variantId, test_id: test.id }
      });
    }
    if (!variant) {
      variant = await TestVariant.findOne({
        where: { test_id: test.id },
        order: [['id', 'ASC']]
      });
    }
    if (!variant) {
      return null;
    }

    variantQuestions = await TestVariantQuestion.findAll({
      where: { variant_id: variant.id },
      order: [['order', 'ASC']]
    });
    const questionIds = variantQuestions.map((vq) => vq.question_id);
    questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });

    // Упорядочиваем в соответствии с order
    const byId = new Map(questions.map((q) => [q.id, q]));
    questions = variantQuestions
      .map((vq) => byId.get(vq.question_id))
      .filter(Boolean);
  } else {
    // single_shuffled
    testQuestions = await TestQuestion.findAll({
      where: { test_id: test.id },
      order: [['order', 'ASC']]
    });
    const questionIds = testQuestions.map((tq) => tq.question_id);
    questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    questions = testQuestions
      .map((tq) => byId.get(tq.question_id))
      .filter(Boolean);

    if (shuffleSingle) {
      questions = questions
        .map((q) => ({ q, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((x) => x.q);
    }
  }

  // Баллы берём из связующих таблиц (если есть)
  let pointsByQuestionId = new Map();

  if (test.variant_mode === 'per_variant') {
    // Для per_variant баллы в test_variant_questions (используем уже загруженные variantQuestions)
    pointsByQuestionId = new Map(
      (variantQuestions || []).map((vq) => [vq.question_id, vq.points || 1])
    );
  } else {
    // Для single_shuffled баллы в test_questions (используем уже загруженные testQuestions)
    pointsByQuestionId = new Map(
      (testQuestions || []).map((tq) => [tq.question_id, tq.points || 1])
    );
  }

  const surveyQuestions = questions.map((q) =>
    buildSurveyQuestionFromModel(q, pointsByQuestionId.get(q.id) || 1)
  );

  return {
    title: test.title,
    description: test.description,
    pages: [
      {
        name: 'page1',
        elements: surveyQuestions
      }
    ]
  };
}

/**
 * Регистрация маршрутов для банка заданий и тестов.
 *
 * - Управление вопросами и тестами: teacher/app-admin.
 * - Получение структуры теста для прохождения: любой авторизованный пользователь.
 */
function registerTestRoutes(app) {
  const router = express.Router();

  function parseQuestionBody(body) {
    const code = body.code;
    let text = body.text;
    const type = body.type || 'radiogroup';
    let options = body.options;
    let correctAnswer = body.correctAnswer;
    const difficulty = body.difficulty;
    const tags = body.tags;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (_) {
        options = null;
      }
    }
    if (typeof correctAnswer === 'string') {
      try {
        correctAnswer = JSON.parse(correctAnswer);
      } catch (_) {
        correctAnswer = correctAnswer;
      }
    }
    return { code, text, type, options, correctAnswer, difficulty, tags };
  }

  // Создание вопроса (только teacher/app-admin), с опциональной картинкой
  router.post(
    '/api/questions',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    uploadQuestionImage.single('image'),
    async (req, res) => {
      try {
        const body = req.body || {};
        const { text, type, options, correctAnswer, difficulty, tags, code } = parseQuestionBody(body);
        const textStr = typeof text === 'string' ? text.trim() : '';

        if (!textStr) {
          return res.status(400).json({
            error: 'text_required',
            message: 'Необходимо указать текст вопроса.'
          });
        }

        const user = req.user || {};
        const createdBy = user.sub || null;
        const now = new Date();
        const imagePath = req.file ? req.file.path : null;

        const question = await Question.create({
          code: code || null,
          text: textStr,
          type: type || 'radiogroup',
          options: options || null,
          correct_answer: correctAnswer !== undefined ? correctAnswer : null,
          difficulty: difficulty || null,
          tags: tags || null,
          image_path: imagePath,
          created_by_user_id: createdBy,
          created_at: now,
          updated_at: now
        });

        return res.status(201).json(question);
      } catch (error) {
        console.error('Error creating question:', error);
        const msg = (error.original && error.original.code === 'ER_BAD_FIELD_ERROR') || (error.message && error.message.includes('image_path'))
          ? 'В таблице questions отсутствует колонка image_path. Выполните миграции: npx sequelize-cli db:migrate'
          : 'Не удалось создать вопрос.';
        return res.status(500).json({
          error: 'create_failed',
          message: msg
        });
      }
    }
  );

  // Получение списка вопросов (только teacher/app-admin)
  router.get(
    '/api/questions',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const idFilter = req.query.id ? parseInt(req.query.id, 10) : null;
        const q = (req.query.q || '').trim();
        const limit = Math.min(
          parseInt(req.query.limit, 10) || 50,
          100
        );
        const offset = parseInt(req.query.offset, 10) || 0;

        const where = {};

        if (idFilter && !Number.isNaN(idFilter)) {
          where.id = idFilter;
        } else if (q) {
          where[Op.or] = [
            { text: { [Op.like]: `%${q}%` } },
            { tags: { [Op.like]: `%${q}%` } }
          ];
        }

        const { rows, count } = await Question.findAndCountAll({
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
        console.error('Error listing questions:', error);
        const msg = (error.original && error.original.code === 'ER_BAD_FIELD_ERROR') || (error.message && error.message.includes('image_path'))
          ? 'В таблице questions отсутствует колонка image_path. Выполните миграции: npx sequelize-cli db:migrate'
          : 'Не удалось загрузить список вопросов.';
        return res.status(500).json({
          error: 'list_failed',
          message: msg
        });
      }
    }
  );

  // Случайные вопросы из банка (для конструктора тестов)
  router.get(
    '/api/questions/random',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const count = Math.min(
          Math.max(1, parseInt(req.query.count, 10) || 1),
          100
        );
        const total = await Question.count();
        const rows = await Question.findAll({
          attributes: ['id'],
          order: [Question.sequelize.fn('RAND')],
          limit: count
        });
        const ids = rows.map((r) => r.id);
        return res.json({ ids, total });
      } catch (error) {
        console.error('Error getting random questions:', error);
        return res.status(500).json({
          error: 'random_failed',
          message: 'Не удалось получить случайные вопросы.'
        });
      }
    }
  );

  // Один вопрос по id (для редактирования)
  router.get(
    '/api/questions/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор вопроса.'
          });
        }
        const question = await Question.findByPk(id);
        if (!question) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Вопрос не найден.'
          });
        }
        return res.json(question);
      } catch (error) {
        console.error('Error getting question:', error);
        return res.status(500).json({
          error: 'get_failed',
          message: 'Не удалось загрузить вопрос.'
        });
      }
    }
  );

  // Картинка вопроса (доступна авторизованным при прохождении теста)
  router.get(
    '/api/questions/:id/image',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор вопроса.'
          });
        }
        const question = await Question.findByPk(id);
        if (!question || !question.image_path) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Изображение не найдено.'
          });
        }
        if (!fs.existsSync(question.image_path)) {
          return res.status(404).json({
            error: 'file_missing',
            message: 'Файл изображения отсутствует.'
          });
        }
        return res.sendFile(path.resolve(question.image_path));
      } catch (error) {
        console.error('Error serving question image:', error);
        return res.status(500).json({
          error: 'image_failed',
          message: 'Не удалось отдать изображение.'
        });
      }
    }
  );

  // Обновление вопроса (только teacher/app-admin)
  router.put(
    '/api/questions/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    uploadQuestionImage.single('image'),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор вопроса.'
          });
        }
        const question = await Question.findByPk(id);
        if (!question) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Вопрос не найден.'
          });
        }
        const body = req.body || {};
        const { text, type, options, correctAnswer, difficulty, tags, code } = parseQuestionBody(body);
        if (typeof text === 'string' && text.trim()) {
          question.text = text.trim();
        }
        if (type) question.type = type;
        if (options !== undefined) question.options = options;
        if (correctAnswer !== undefined) question.correct_answer = correctAnswer;
        if (difficulty !== undefined) question.difficulty = difficulty;
        if (tags !== undefined) question.tags = tags;
        if (code !== undefined) question.code = code;
        if (req.file) {
          if (question.image_path && fs.existsSync(question.image_path)) {
            try {
              fs.unlinkSync(question.image_path);
            } catch (_) {}
          }
          question.image_path = req.file.path;
        }
        question.updated_at = new Date();
        await question.save();
        return res.json(question);
      } catch (error) {
        console.error('Error updating question:', error);
        return res.status(500).json({
          error: 'update_failed',
          message: 'Не удалось обновить вопрос.'
        });
      }
    }
  );

  // Удаление вопроса из банка (только teacher/app-admin)
  router.delete(
    '/api/questions/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор вопроса.'
          });
        }
        const question = await Question.findByPk(id);
        if (!question) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Вопрос не найден.'
          });
        }
        if (question.image_path && fs.existsSync(question.image_path)) {
          try {
            fs.unlinkSync(question.image_path);
          } catch (_) {}
        }
        await question.destroy();
        return res.status(204).send();
      } catch (error) {
        console.error('Error deleting question:', error);
        return res.status(500).json({
          error: 'delete_failed',
          message: 'Не удалось удалить вопрос.'
        });
      }
    }
  );

  // Создание теста (оба режима вариантов)
  router.post(
    '/api/tests',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      const transaction = await Test.sequelize.transaction();
      try {
        const {
          title,
          description,
          variantMode,
          variants,
          questionIds,
          questions,
          passPercent,
          maxAttempts
        } = req.body || {};

        if (!title || !title.trim()) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'title_required',
            message: 'Необходимо указать название теста.'
          });
        }

        if (variantMode !== 'per_variant' && variantMode !== 'single_shuffled') {
          await transaction.rollback();
          return res.status(400).json({
            error: 'variant_mode_invalid',
            message:
              'variantMode должен быть per_variant или single_shuffled.'
          });
        }

        const user = req.user || {};
        const createdBy = user.sub || null;
        const now = new Date();

        const test = await Test.create(
          {
            title: title.trim(),
            description: description || '',
            variant_mode: variantMode,
            pass_percent:
              typeof passPercent === 'number'
                ? Math.max(0, Math.min(100, passPercent))
                : null,
            max_attempts:
              typeof maxAttempts === 'number' && maxAttempts > 0
                ? Math.floor(maxAttempts)
                : null,
            created_by_user_id: createdBy,
            created_at: now,
            updated_at: now
          },
          { transaction }
        );

        if (variantMode === 'per_variant') {
          if (!Array.isArray(variants) || variants.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
              error: 'variants_required',
              message:
                'Для режима per_variant необходимо передать массив variants.'
            });
          }

          for (const v of variants) {
            const vQuestions = Array.isArray(v.questions)
              ? v.questions
              : (v.questionIds || []).map((id) => ({ id, points: 1 }));

            if (!v || !v.label || vQuestions.length === 0) {
              await transaction.rollback();
              return res.status(400).json({
                error: 'variant_invalid',
                message:
                  'Каждый вариант должен содержать label и непустой массив questionIds.'
              });
            }

            const variant = await TestVariant.create(
              {
                test_id: test.id,
                label: v.label
              },
              { transaction }
            );

            let order = 1;
            for (const q of vQuestions) {
              await TestVariantQuestion.create(
                {
                  variant_id: variant.id,
                  question_id: q.id,
                  order,
                  points:
                    typeof q.points === 'number' && q.points > 0
                      ? Math.floor(q.points)
                      : 1
                },
                { transaction }
              );
              order += 1;
            }
          }
        } else {
          const qList = Array.isArray(questions)
            ? questions
            : (questionIds || []).map((id) => ({ id, points: 1 }));

          if (qList.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
              error: 'question_ids_required',
              message:
                'Для режима single_shuffled необходимо передать массив questionIds.'
            });
          }

          let order = 1;
          for (const q of qList) {
            await TestQuestion.create(
              {
                test_id: test.id,
                question_id: q.id,
                order,
                points:
                  typeof q.points === 'number' && q.points > 0
                    ? Math.floor(q.points)
                    : 1
              },
              { transaction }
            );
            order += 1;
          }
        }

        await transaction.commit();
        return res.status(201).json(test);
      } catch (error) {
        console.error('Error creating test:', error);
        await transaction.rollback();
        return res.status(500).json({
          error: 'create_failed',
          message: 'Не удалось создать тест.'
        });
      }
    }
  );

  // Получение теста с составом (для редактирования) - teacher/app-admin
  router.get(
    '/api/tests/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста.'
          });
        }
        const test = await Test.findByPk(id);
        if (!test) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Тест не найден.'
          });
        }

        if (test.variant_mode === 'per_variant') {
          const variants = await TestVariant.findAll({
            where: { test_id: id },
            order: [['id', 'ASC']]
          });
          const variantIds = variants.map((v) => v.id).filter(Boolean);
          const vqs = variantIds.length
            ? await TestVariantQuestion.findAll({
                where: { variant_id: { [Op.in]: variantIds } },
                order: [['order', 'ASC']]
              })
            : [];

          const questionIds = vqs.map((x) => x.question_id).filter(Boolean);
          const questions = questionIds.length
            ? await Question.findAll({
                where: { id: { [Op.in]: questionIds } }
              })
            : [];
          const byId = new Map(questions.map((q) => [q.id, q]));

          const byVariantId = new Map();
          for (const row of vqs) {
            const arr = byVariantId.get(row.variant_id) || [];
            arr.push(row);
            byVariantId.set(row.variant_id, arr);
          }

          return res.json({
            id: test.id,
            title: test.title,
            description: test.description,
            variantMode: test.variant_mode,
            passPercent: test.pass_percent,
            maxAttempts: test.max_attempts,
            variants: variants.map((v) => ({
              label: v.label,
              questions: (byVariantId.get(v.id) || []).map((row) => ({
                id: row.question_id,
                points: row.points || 1,
                text: (byId.get(row.question_id)?.text || '').slice(0, 120)
              }))
            }))
          });
        }

        const tqs = await TestQuestion.findAll({
          where: { test_id: id },
          order: [['order', 'ASC']]
        });
        const questionIds = tqs.map((x) => x.question_id).filter(Boolean);
        const questions = questionIds.length
          ? await Question.findAll({
              where: { id: { [Op.in]: questionIds } }
            })
          : [];
        const byId = new Map(questions.map((q) => [q.id, q]));

        return res.json({
          id: test.id,
          title: test.title,
          description: test.description,
          variantMode: test.variant_mode,
          passPercent: test.pass_percent,
          maxAttempts: test.max_attempts,
          questions: tqs.map((row) => ({
            id: row.question_id,
            points: row.points || 1,
            text: (byId.get(row.question_id)?.text || '').slice(0, 120)
          }))
        });
      } catch (error) {
        console.error('Error getting test for edit:', error);
        return res.status(500).json({
          error: 'get_failed',
          message: 'Не удалось загрузить тест.'
        });
      }
    }
  );

  // Обновление теста (teacher/app-admin)
  router.put(
    '/api/tests/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      const transaction = await Test.sequelize.transaction();
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста.'
          });
        }

        const test = await Test.findByPk(id, { transaction });
        if (!test) {
          await transaction.rollback();
          return res.status(404).json({
            error: 'not_found',
            message: 'Тест не найден.'
          });
        }

        const {
          title,
          description,
          variantMode,
          variants,
          questionIds,
          questions,
          passPercent,
          maxAttempts
        } = req.body || {};

        if (!title || !title.trim()) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'title_required',
            message: 'Необходимо указать название теста.'
          });
        }
        if (variantMode !== 'per_variant' && variantMode !== 'single_shuffled') {
          await transaction.rollback();
          return res.status(400).json({
            error: 'variant_mode_invalid',
            message: 'variantMode должен быть per_variant или single_shuffled.'
          });
        }

        test.title = title.trim();
        test.description = description || '';
        test.variant_mode = variantMode;
        test.pass_percent =
          typeof passPercent === 'number'
            ? Math.max(0, Math.min(100, passPercent))
            : null;
        test.max_attempts =
          typeof maxAttempts === 'number' && maxAttempts > 0
            ? Math.floor(maxAttempts)
            : null;
        test.updated_at = new Date();
        await test.save({ transaction });

        // чистим состав
        const oldVariants = await TestVariant.findAll({
          where: { test_id: id },
          transaction
        });
        const oldVariantIds = oldVariants.map((v) => v.id).filter(Boolean);
        if (oldVariantIds.length) {
          await TestVariantQuestion.destroy({
            where: { variant_id: { [Op.in]: oldVariantIds } },
            transaction
          });
        }
        await TestVariant.destroy({ where: { test_id: id }, transaction });
        await TestQuestion.destroy({ where: { test_id: id }, transaction });

        if (variantMode === 'per_variant') {
          if (!Array.isArray(variants) || variants.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
              error: 'variants_required',
              message: 'Для режима per_variant необходимо передать массив variants.'
            });
          }

          for (const v of variants) {
            const vQuestions = Array.isArray(v.questions)
              ? v.questions
              : (v.questionIds || []).map((qid) => ({ id: qid, points: 1 }));

            if (!v || !v.label || vQuestions.length === 0) {
              await transaction.rollback();
              return res.status(400).json({
                error: 'variant_invalid',
                message: 'Каждый вариант должен содержать label и непустой массив questionIds.'
              });
            }

            const variant = await TestVariant.create(
              {
                test_id: test.id,
                label: v.label
              },
              { transaction }
            );

            let order = 1;
            for (const q of vQuestions) {
              await TestVariantQuestion.create(
                {
                  variant_id: variant.id,
                  question_id: q.id,
                  order,
                  points:
                    typeof q.points === 'number' && q.points > 0
                      ? Math.floor(q.points)
                      : 1
                },
                { transaction }
              );
              order += 1;
            }
          }
        } else {
          const qList = Array.isArray(questions)
            ? questions
            : (questionIds || []).map((qid) => ({ id: qid, points: 1 }));
          if (qList.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
              error: 'question_ids_required',
              message: 'Для режима single_shuffled необходимо передать массив questionIds.'
            });
          }

          let order = 1;
          for (const q of qList) {
            await TestQuestion.create(
              {
                test_id: test.id,
                question_id: q.id,
                order,
                points:
                  typeof q.points === 'number' && q.points > 0
                    ? Math.floor(q.points)
                    : 1
              },
              { transaction }
            );
            order += 1;
          }
        }

        await transaction.commit();
        return res.json(test);
      } catch (error) {
        console.error('Error updating test:', error);
        await transaction.rollback();
        return res.status(500).json({
          error: 'update_failed',
          message: 'Не удалось обновить тест.'
        });
      }
    }
  );

  // Удаление теста (только teacher/app-admin)
  router.delete(
    '/api/tests/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin']),
    async (req, res) => {
      const transaction = await Test.sequelize.transaction();
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста.'
          });
        }

        const test = await Test.findByPk(id, { transaction });
        if (!test) {
          await transaction.rollback();
          return res.status(404).json({
            error: 'not_found',
            message: 'Тест не найден.'
          });
        }

        // Удаляем связанные записи (вопросы и варианты)
        const variants = await TestVariant.findAll({
          where: { test_id: id },
          transaction
        });
        const variantIds = variants.map((v) => v.id).filter(Boolean);
        if (variantIds.length) {
          await TestVariantQuestion.destroy({
            where: { variant_id: { [Op.in]: variantIds } },
            transaction
          });
        }

        await TestVariant.destroy({ where: { test_id: id }, transaction });
        await TestQuestion.destroy({ where: { test_id: id }, transaction });

        // Удаляем результаты/попытки студентов по этому тесту
        await TestAttempt.destroy({ where: { test_id: id }, transaction });

        await test.destroy({ transaction });

        await transaction.commit();
        return res.status(204).send();
      } catch (error) {
        console.error('Error deleting test:', error);
        await transaction.rollback();
        return res.status(500).json({
          error: 'delete_failed',
          message: 'Не удалось удалить тест.'
        });
      }
    }
  );

  // Список тестов (виден всем авторизованным, без деталей вариантов)
  router.get(
    '/api/tests',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const idFilter = req.query.id ? parseInt(req.query.id, 10) : null;
        const where = {};
        if (idFilter && !Number.isNaN(idFilter)) {
          where.id = idFilter;
        }
        const tests = await Test.findAll({
          where,
          order: [['created_at', 'DESC']]
        });
        return res.json(tests);
      } catch (error) {
        console.error('Error listing tests:', error);
        return res.status(500).json({
          error: 'list_failed',
          message: 'Не удалось загрузить список тестов.'
        });
      }
    }
  );

  // Сводка по попыткам для текущего пользователя (по всем тестам)
  router.get(
    '/api/tests/attempts/summary',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const user = req.user || {};
        const userId = user.sub || null;
        if (!userId) return res.status(401).json({ error: 'unauthorized' });

        const counts = await TestAttempt.findAll({
          where: { user_id: userId },
          attributes: [
            'test_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'attemptsCount']
          ],
          group: ['test_id'],
          raw: true
        });

        const byTestId = {};
        for (const row of counts) {
          const testId = row.test_id;
          const attemptsCount = Number(row.attemptsCount) || 0;
          if (testId != null) {
            byTestId[String(testId)] = attemptsCount;
          }
        }

        return res.json({
          userId,
          attemptsByTestId: byTestId
        });
      } catch (error) {
        console.error('Error building attempts summary:', error);
        return res.status(500).json({
          error: 'attempts_summary_failed',
          message: 'Не удалось получить сводку по попыткам.'
        });
      }
    }
  );

  // Получение схемы теста для прохождения (SurveyJS-compatible)
  router.get(
    '/api/tests/:id/run',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста.'
          });
        }

        const test = await Test.findByPk(id);
        if (!test) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Тест не найден.'
          });
        }

        const schema = await buildSurveySchemaForTest(test, {
          shuffleSingle: true
        });

        if (!schema) {
          return res.status(400).json({
            error: 'no_questions',
            message: 'Для данного теста не настроены вопросы.'
          });
        }

        const user = req.user || {};
        const userId = user.sub || null;
        const userAttemptCount = userId
          ? await TestAttempt.count({
              where: { test_id: test.id, user_id: userId }
            })
          : 0;

        return res.json({
          id: test.id,
          title: test.title,
          description: test.description,
          variantMode: test.variant_mode,
          passPercent: test.pass_percent,
          maxAttempts: test.max_attempts,
          userAttemptCount,
          schema
        });
      } catch (error) {
        console.error('Error building test run schema:', error);
        return res.status(500).json({
          error: 'run_failed',
          message: 'Не удалось подготовить тест для прохождения.'
        });
      }
    }
  );

  // Старт попытки (попытка списывается при открытии теста)
  router.post(
    '/api/tests/:id/attempts/start',
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
        if (!userId) {
          return res.status(401).json({ error: 'unauthorized' });
        }

        const maxAttempts = typeof test.max_attempts === 'number' ? test.max_attempts : null;
        const now = new Date();

        const createdAttempt = await sequelize.transaction(async (t) => {
          const [rows] = await sequelize.query(
            'SELECT COUNT(*) AS cnt FROM test_attempts WHERE test_id = ? AND user_id = ? FOR UPDATE',
            {
              replacements: [testId, userId],
              transaction: t
            }
          );
          const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;

          if (maxAttempts && maxAttempts > 0 && cnt >= maxAttempts) {
            const err = new Error('max_attempts_reached');
            err.statusCode = 409;
            err.payload = {
              error: 'max_attempts_reached',
              message: 'Вы исчерпали максимальное количество попыток для этого теста.',
              maxAttempts,
              userAttemptCount: cnt
            };
            throw err;
          }

          const attempt = await TestAttempt.create(
            {
              test_id: testId,
              user_id: userId,
              username,
              status: 'started',
              started_at: now,
              created_at: now
            },
            { transaction: t }
          );

          return { attempt, userAttemptCountAfter: cnt + 1 };
        });

        return res.status(201).json({
          attemptId: createdAttempt.attempt.id,
          maxAttempts: test.max_attempts,
          passPercent: test.pass_percent,
          userAttemptCount: createdAttempt.userAttemptCountAfter
        });
      } catch (error) {
        const status = error.statusCode || 500;
        if (status === 409 && error.payload) {
          return res.status(409).json(error.payload);
        }
        console.error('Error starting test attempt:', error);
        return res.status(status).json({
          error: 'attempt_start_failed',
          message: 'Не удалось начать попытку.'
        });
      }
    }
  );

  // Завершение попытки (запись результата в ранее созданную попытку)
  router.patch(
    '/api/tests/:id/attempts/:attemptId/finish',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const testId = parseInt(req.params.id, 10);
        const attemptId = parseInt(req.params.attemptId, 10);
        if (Number.isNaN(testId) || Number.isNaN(attemptId)) {
          return res.status(400).json({
            error: 'bad_id',
            message: 'Некорректный идентификатор теста/попытки.'
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

        const user = req.user || {};
        const userId = user.sub || null;
        if (!userId) return res.status(401).json({ error: 'unauthorized' });

        const attempt = await TestAttempt.findOne({
          where: {
            id: attemptId,
            test_id: testId,
            user_id: userId
          }
        });
        if (!attempt) {
          return res.status(404).json({
            error: 'attempt_not_found',
            message: 'Попытка не найдена.'
          });
        }

        let percent = (correctAnswers / questionCount) * 100;
        if (
          typeof earnedPoints === 'number' &&
          typeof maxPoints === 'number' &&
          maxPoints > 0
        ) {
          percent = (earnedPoints / maxPoints) * 100;
        }

        attempt.correct_answers = correctAnswers;
        attempt.question_count = questionCount;
        attempt.percent = percent;
        attempt.status = 'finished';
        attempt.finished_at = new Date();
        await attempt.save();

        return res.json({ ok: true });
      } catch (error) {
        console.error('Error finishing test attempt:', error);
        return res.status(500).json({
          error: 'attempt_finish_failed',
          message: 'Не удалось сохранить результат теста.'
        });
      }
    }
  );

  app.use(router);
}

//-----------Экспортируемые модули-----------//
module.exports = {
  registerTestRoutes
};
//-----------Экспортируемые модули-----------//

