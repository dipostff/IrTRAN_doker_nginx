const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const keycloakAuth = require('../auth/keycloakAuth');
const OpenDayRun = require('../../models/OpenDayRun');

const DIRS = ['pi', 'is', 'bas', 'bi'];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Простой in-memory rate limit без внешних зависимостей. */
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 40;

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function rateLimitPublic(req, res, next) {
  const key = clientIp(req);
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Слишком много запросов. Попробуйте чуть позже.'
    });
  }
  next();
}

function clampPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseDateBound(value, endOfDay) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function registerOpenDayRoutes(app) {
  const router = express.Router();

  /**
   * Публичная запись событий теста дня открытых дверей.
   * Не требует токена. Персональные данные не принимаются.
   *
   * Body:
   *  - event: 'start' | 'finish'
   *  - client_run_id: uuid
   *  - при finish: top, second?, low?, is_close?, percent?, question_ids?, duration_sec?
   */
  router.post('/api/open-day/events', rateLimitPublic, async (req, res) => {
    try {
      const body = req.body || {};
      const event = String(body.event || '').trim();
      const clientRunId = String(body.client_run_id || '').trim();

      if (!UUID_RE.test(clientRunId)) {
        return res.status(400).json({ error: 'invalid_client_run_id' });
      }
      if (event !== 'start' && event !== 'finish') {
        return res.status(400).json({ error: 'invalid_event' });
      }

      const now = new Date();

      if (event === 'start') {
        const [row] = await OpenDayRun.findOrCreate({
          where: { client_run_id: clientRunId },
          defaults: {
            client_run_id: clientRunId,
            status: 'started',
            started_at: now,
            created_at: now,
            updated_at: now
          }
        });
        return res.status(201).json({
          ok: true,
          id: row.id,
          client_run_id: row.client_run_id,
          status: row.status
        });
      }

      const top = String(body.top || '').trim();
      if (!DIRS.includes(top)) {
        return res.status(400).json({ error: 'invalid_top' });
      }

      const secondRaw = body.second != null ? String(body.second).trim() : null;
      const lowRaw = body.low != null ? String(body.low).trim() : null;
      const second = DIRS.includes(secondRaw) ? secondRaw : null;
      const low = DIRS.includes(lowRaw) ? lowRaw : null;
      const isClose = body.is_close == null ? null : !!body.is_close;

      const percent = body.percent && typeof body.percent === 'object' ? body.percent : {};
      const percentPi = clampPercent(percent.pi);
      const percentIs = clampPercent(percent.is);
      const percentBas = clampPercent(percent.bas);
      const percentBi = clampPercent(percent.bi);

      let questionIds = null;
      if (Array.isArray(body.question_ids)) {
        const cleaned = body.question_ids
          .map((id) => String(id || '').slice(0, 64))
          .filter(Boolean)
          .slice(0, 12);
        questionIds = cleaned.length ? JSON.stringify(cleaned) : null;
      }

      let durationSec = null;
      if (body.duration_sec != null) {
        const d = Number(body.duration_sec);
        if (Number.isFinite(d) && d >= 0 && d <= 3600) durationSec = Math.round(d);
      }

      let row = await OpenDayRun.findOne({ where: { client_run_id: clientRunId } });
      if (!row) {
        row = await OpenDayRun.create({
          client_run_id: clientRunId,
          status: 'finished',
          top,
          second,
          low,
          is_close: isClose,
          percent_pi: percentPi,
          percent_is: percentIs,
          percent_bas: percentBas,
          percent_bi: percentBi,
          question_ids: questionIds,
          duration_sec: durationSec,
          started_at: now,
          finished_at: now,
          created_at: now,
          updated_at: now
        });
      } else if (row.status === 'finished') {
        // Идемпотентность: повторный finish того же прогона не дублирует статистику.
        return res.json({
          ok: true,
          id: row.id,
          client_run_id: row.client_run_id,
          status: row.status,
          already_finished: true
        });
      } else {
        await row.update({
          status: 'finished',
          top,
          second,
          low,
          is_close: isClose,
          percent_pi: percentPi,
          percent_is: percentIs,
          percent_bas: percentBas,
          percent_bi: percentBi,
          question_ids: questionIds,
          duration_sec: durationSec,
          finished_at: now,
          updated_at: now
        });
      }

      return res.json({
        ok: true,
        id: row.id,
        client_run_id: row.client_run_id,
        status: 'finished'
      });
    } catch (err) {
      console.error('POST /api/open-day/events', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * Агрегированная статистика для преподавателя / администратора.
   * Query: from, to (YYYY-MM-DD, опционально).
   */
  router.get(
    '/api/open-day/stats',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['app-admin', 'teacher']),
    async (req, res) => {
      try {
        const from = parseDateBound(req.query.from, false);
        const to = parseDateBound(req.query.to, true);

        const where = {};
        if (from || to) {
          where.started_at = {};
          if (from) where.started_at[Op.gte] = from;
          if (to) where.started_at[Op.lte] = to;
        }

        const started = await OpenDayRun.count({ where });
        const finishedWhere = { ...where, status: 'finished' };
        const finished = await OpenDayRun.count({ where: finishedWhere });

        const byTopRows = await OpenDayRun.findAll({
          attributes: ['top', [fn('COUNT', col('id')), 'cnt']],
          where: { ...finishedWhere, top: { [Op.ne]: null } },
          group: ['top'],
          raw: true
        });
        const byTop = Object.fromEntries(DIRS.map((d) => [d, 0]));
        for (const row of byTopRows) {
          if (DIRS.includes(row.top)) byTop[row.top] = Number(row.cnt) || 0;
        }
        const byTopPercent = Object.fromEntries(
          DIRS.map((d) => [d, pct(byTop[d], finished)])
        );

        const closeCount = await OpenDayRun.count({
          where: { ...finishedWhere, is_close: true }
        });

        const avgRow = await OpenDayRun.findOne({
          attributes: [
            [fn('AVG', col('percent_pi')), 'avg_pi'],
            [fn('AVG', col('percent_is')), 'avg_is'],
            [fn('AVG', col('percent_bas')), 'avg_bas'],
            [fn('AVG', col('percent_bi')), 'avg_bi'],
            [fn('AVG', col('duration_sec')), 'avg_duration']
          ],
          where: finishedWhere,
          raw: true
        });

        const avgPercent = {
          pi: avgRow?.avg_pi != null ? Math.round(Number(avgRow.avg_pi) * 10) / 10 : null,
          is: avgRow?.avg_is != null ? Math.round(Number(avgRow.avg_is) * 10) / 10 : null,
          bas: avgRow?.avg_bas != null ? Math.round(Number(avgRow.avg_bas) * 10) / 10 : null,
          bi: avgRow?.avg_bi != null ? Math.round(Number(avgRow.avg_bi) * 10) / 10 : null
        };
        const avgDurationSec =
          avgRow?.avg_duration != null
            ? Math.round(Number(avgRow.avg_duration))
            : null;

        const dayRows = await OpenDayRun.findAll({
          attributes: [
            [fn('DATE', col('started_at')), 'day'],
            [fn('COUNT', col('id')), 'started_cnt'],
            [
              fn(
                'SUM',
                literal("CASE WHEN status = 'finished' THEN 1 ELSE 0 END")
              ),
              'finished_cnt'
            ]
          ],
          where,
          group: [fn('DATE', col('started_at'))],
          order: [[fn('DATE', col('started_at')), 'ASC']],
          raw: true
        });

        const byDay = (dayRows || []).map((r) => {
          const dayStarted = Number(r.started_cnt) || 0;
          const dayFinished = Number(r.finished_cnt) || 0;
          const dayDropped = Math.max(0, dayStarted - dayFinished);
          return {
            date: r.day,
            started: dayStarted,
            finished: dayFinished,
            dropped: dayDropped,
            dropoff_rate: pct(dayDropped, dayStarted)
          };
        });

        const dropped = Math.max(0, started - finished);

        return res.json({
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null,
          started,
          finished,
          dropped,
          completion_rate: pct(finished, started),
          dropoff_rate: pct(dropped, started),
          by_top: byTop,
          by_top_percent: byTopPercent,
          close_count: closeCount,
          close_percent: pct(closeCount, finished),
          avg_percent: avgPercent,
          avg_duration_sec: avgDurationSec,
          by_day: byDay
        });
      } catch (err) {
        console.error('GET /api/open-day/stats', err);
        return res.status(500).json({ error: 'internal_error' });
      }
    }
  );

  app.use(router);
}

module.exports = { registerOpenDayRoutes };
