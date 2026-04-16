/**
 * Сравнение payload студента с образцом преподавателя (JSON diff).
 */

/** Не сравниваем служебные поля верхнего уровня */
const IGNORE_TOP_LEVEL_KEYS = new Set(['id', 'backendId', 'createdAt', 'signed']);

const KEY_LABELS = {
  id_station: 'Станция',
  act_date: 'Дата составления акта',
  downtime_type: 'Начало/окончание простоя',
  description: 'Описание',
  supplement: 'Дополнение',
  persons: 'Присутствовавшие лица',
  wagons: 'Вагоны / отправки',
  special_marks: 'Специальные отметки',
  attached_documents: 'Прилагаемые документы',
  position: 'Должность',
  full_name: 'ФИО',
  vehicle_number: 'Номер вагона/контейнера',
  shipment_label: 'Отправка',
  reminder_type: 'Тип памятки',
  id_owner: 'Владелец пути',
  id_payer: 'Плательщик',
  id_contract: 'Договор',
  id_carrier_org: 'Перевозчик',
  period_from: 'Период с',
  period_to: 'Период по',
  place_of_calculation: 'Место расчёта',
  fee_rows: 'Строки сборов',
  invoice_type: 'Тип накладной',
  id_shipper: 'Грузоотправитель',
  id_receiver: 'Грузополучатель',
  goods: 'Грузовые позиции',
  route_rows: 'Маршрут',
  train_number: 'Номер поезда',
  arrival_date: 'Дата прибытия',
  commercial_wagons: 'Вагоны',
};

function labelForSegment(seg) {
  if (/^\d+$/.test(String(seg))) return `строка ${Number(seg) + 1}`;
  return KEY_LABELS[seg] || String(seg).replace(/_/g, ' ');
}

function humanPath(segments) {
  return segments.map(labelForSegment).join(' → ');
}

function deepEqualNormalized(a, b) {
  return JSON.stringify(normalizeTree(a)) === JSON.stringify(normalizeTree(b));
}

function normalizeTree(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(normalizeTree);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = normalizeTree(v[k]);
    }
    return out;
  }
  return v;
}

function valueKind(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  return 'primitive';
}

function shouldSkipKey(segments, key) {
  return segments.length === 0 && IGNORE_TOP_LEVEL_KEYS.has(key);
}

/**
 * @param {object} actual — документ студента
 * @param {object} expected — образец преподавателя
 * @returns {{ match: boolean, summary: object, differences: Array }}
 */
function comparePayloads(actual, expected) {
  const differences = [];
  const summary = { missing: 0, extra: 0, mismatch: 0 };

  function add(diff) {
    differences.push(diff);
    summary[diff.kind] += 1;
  }

  function walk(a, e, segments) {
    const pathStr = segments.length ? segments.join('.') : '(корень)';
    const kA = valueKind(a);
    const kE = valueKind(e);

    if (kE === 'object' && kA === 'object') {
      const keys = new Set([...Object.keys(e), ...Object.keys(a)]);
      for (const k of keys) {
        if (shouldSkipKey(segments, k)) continue;
        const next = [...segments, k];
        const hasE = Object.prototype.hasOwnProperty.call(e, k);
        const hasA = Object.prototype.hasOwnProperty.call(a, k);
        if (!hasE) {
          if (hasA && a[k] !== undefined) {
            add({
              path: next.join('.'),
              label: humanPath(next),
              kind: 'extra',
              expected: null,
              actual: a[k]
            });
          }
          continue;
        }
        if (!hasA || a[k] === undefined) {
          add({
            path: next.join('.'),
            label: humanPath(next),
            kind: 'missing',
            expected: e[k],
            actual: undefined
          });
          continue;
        }
        walk(a[k], e[k], next);
      }
      return;
    }

    if (kE === 'array' && kA === 'array') {
      const max = Math.max(a.length, e.length);
      if (a.length !== e.length) {
        add({
          path: `${pathStr} [длина]`,
          label: `${humanPath(segments)} (число строк)`,
          kind: 'mismatch',
          expected: e.length,
          actual: a.length
        });
      }
      for (let i = 0; i < max; i += 1) {
        const next = [...segments, String(i)];
        if (i >= e.length) {
          if (i < a.length) {
            add({
              path: next.join('.'),
              label: humanPath(next),
              kind: 'extra',
              expected: null,
              actual: a[i]
            });
          }
          continue;
        }
        if (i >= a.length) {
          add({
            path: next.join('.'),
            label: humanPath(next),
            kind: 'missing',
            expected: e[i],
            actual: undefined
          });
          continue;
        }
        walk(a[i], e[i], next);
      }
      return;
    }

    if (kE !== kA) {
      add({
        path: pathStr,
        label: humanPath(segments),
        kind: 'mismatch',
        expected: e,
        actual: a
      });
      return;
    }

    if (!deepEqualNormalized(a, e)) {
      add({
        path: pathStr,
        label: humanPath(segments),
        kind: 'mismatch',
        expected: e,
        actual: a
      });
    }
  }

  walk(actual || {}, expected || {}, []);

  const match = differences.length === 0;
  return { match, summary, differences };
}

function formatDiffValue(v) {
  if (v === undefined) return '—';
  if (v === null) return '—';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

module.exports = {
  comparePayloads,
  formatDiffValue,
  IGNORE_TOP_LEVEL_KEYS,
};
