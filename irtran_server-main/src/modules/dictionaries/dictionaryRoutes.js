//-----------Подключаемые модули-----------//
const express = require('express');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const keycloakAuth = require('../auth/keycloakAuth');
const sequelize = require('../sequelize/db');
//-----------Подключаемые модули-----------//

const queryInterface = sequelize.getQueryInterface();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// Разрешённые справочники. Ключ используется на фронтенде.
// Таблицы уже существуют в БД и используются формами документов.
const DICTIONARIES = {
  countries: {
    table: 'countries',
    label: 'Страны',
    fieldLabels: {
      name: 'Наименование страны',
      short_name: 'Краткое наименование',
      OSCM_code: 'Код ОКСМ',
      COATO_code: 'Код ОКАТО',
      OSZhD_code: 'Код ОСЖД',
      type_state: 'Тип государства',
      administration_code_digit: 'Цифровой код администрации',
      administration_code_symbol: 'Буквенный код администрации',
      order_number: 'Порядковый номер',
      country_code_ISO_3166: 'Код ISO 3166'
    },
    fieldOrder: [
      'name',
      'short_name',
      'OSCM_code',
      'COATO_code',
      'OSZhD_code',
      'type_state',
      'administration_code_digit',
      'administration_code_symbol',
      'order_number',
      'country_code_ISO_3166'
    ]
  },
  stations: {
    table: 'stations',
    label: 'Станции',
    fieldLabels: {
      name: 'Наименование станции',
      code: 'Код станции',
      short_name: 'Краткое наименование',
      railway: 'Дорога',
      paragraph: 'Параграфы',
      knot: 'Узел'
    }
  },
  legal_entities: {
    table: 'legal_entities',
    label: 'Юридические лица',
    fieldLabels: {
      title: 'Наименование организации',
      inn: 'ИНН',
      kpp: 'КПП',
      code: 'Код',
      short_name: 'Краткое наименование'
    }
  },
  owners_non_public_railway: {
    table: 'owners_non_public_railway',
    label: 'Владельцы ж/д путей необщего пользования',
    fieldLabels: {
      name: 'Наименование владельца',
      code: 'Код владельца'
    }
  },
  transport_package_types: {
    table: 'transport_package_types',
    label: 'Виды транспортной упаковки',
    fieldLabels: {
      code: 'Код вида упаковки',
      name: 'Наименование вида упаковки'
    }
  },
  rolling_stock_types: {
    table: 'rolling_stock_types',
    label: 'Виды подвижного состава',
    fieldLabels: {
      code: 'Код рода подвижного состава',
      name: 'Наименование рода подвижного состава'
    }
  },
  destination_indications: {
    table: 'destination_indications',
    label: 'Признаки назначения/станций',
    fieldLabels: {
      name: 'Наименование признака',
      code: 'Код признака'
    }
  },
  contracts: {
    table: 'contracts',
    label: 'Договоры/контракты',
    fieldLabels: {
      code: 'Код договора',
      short_name: 'Обозначение договора',
      title: 'Полное наименование договора'
    }
  },
  payer_types: {
    table: 'payer_types',
    label: 'Виды плательщиков',
    fieldLabels: {
      name: 'Наименование вида плательщика'
    }
  },
  payers: {
    table: 'payers',
    label: 'Плательщики / экспедиторы',
    fieldLabels: {
      id_payer_type: 'Тип плательщика',
      id_country_transportation: 'Страна перевозки',
      id_payer: 'Организация-плательщик',
      OKPO: 'ОКПО',
      name: 'Наименование плательщика',
      addr: 'Адрес',
      note: 'Примечание'
    }
  },
  cargo_groups: {
    table: 'cargo_groups',
    label: 'Группы грузов',
    fieldLabels: {
      name: 'Наименование группы груза',
      code: 'Код группы груза',
      min_load: 'Минимальная масса груза (тонн)',
      max_load: 'Максимальная масса груза (тонн)'
    }
  },
  cargo: {
    table: 'cargo',
    label: 'Грузы',
    fieldLabels: {
      name: 'Наименование груза',
      short_name: 'Краткое наименование',
      code_ETSNG: 'Код ЕТ СНГ / ГНГ',
      number_group: 'Номер группы груза',
      name_group: 'Наименование группы груза'
    }
  },
  ownerships: {
    table: 'ownerships',
    label: 'Формы собственности вагонов',
    fieldLabels: {
      name: 'Наименование формы собственности',
      code: 'Код формы собственности'
    }
  },
  speed_types: {
    table: 'speed_types',
    label: 'Виды скорости перевозки',
    fieldLabels: {
      name: 'Наименование вида скорости',
      code: 'Код вида скорости'
    }
  },
  methods_submission: {
    table: 'methods_submission',
    label: 'Способы подачи вагонов',
    fieldLabels: {
      name: 'Наименование способа подачи',
      code: 'Код способа подачи'
    }
  },
  send_types: {
    table: 'send_types',
    label: 'Виды отправок',
    fieldLabels: {
      name: 'Наименование вида отправки',
      code_IODV: 'Код ИОДВ',
      abbreviation: 'Сокращённое обозначение',
      code_CO_11: 'Код СО-11'
    }
  },
  signs_sending: {
    table: 'signs_sending',
    label: 'Признаки отправки',
    fieldLabels: {
      name: 'Наименование признака отправки',
      code: 'Код признака отправки'
    }
  },
  knot_cargo_groups: {
    table: 'knot_cargo_groups',
    label: 'Узел -> разрешенные группы грузов',
    fieldLabels: {
      knot_key: 'Ключ узла',
      id_cargo_group: 'Разрешенная группа груза'
    }
  },
  knot_cargos: {
    table: 'knot_cargos',
    label: 'Узел -> разрешенные грузы',
    fieldLabels: {
      knot_key: 'Ключ узла',
      id_cargo: 'Разрешенный груз'
    }
  }
};

// Кэш описаний таблиц, чтобы не вызывать describeTable на каждый запрос.
const tableMetaCache = new Map();

function normalizeFlag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[–—−]/g, '-')
    .replace(/[_\s-]+/g, '');
}

const IMPORT_CONFIG = {
  stations: {
    uniqueBy: ['code', 'name'],
    // Специальный формат nodes_map.json:
    // {
    //   stations: { "Станция": [...] },
    //   railway: { "Станция": "..." },
    //   station_code: { "Станция": "..." },
    //   short_name: { "Станция": "..." },
    //   station_paragraphs: { "Станция": "..." }
    // }
    transformJsonObject: (data) => {
      if (!data || typeof data !== 'object' || !data.stations || typeof data.stations !== 'object') {
        return null;
      }
      const stationNames = Object.keys(data.stations || {});
      return stationNames.map((name) => ({
        name,
        railway: data.railway?.[name] ?? '',
        code: data.station_code?.[name] ?? '',
        short_name: data.short_name?.[name] ?? '',
        paragraph: data.station_paragraphs?.[name] ?? ''
      }));
    },
    headerAliases: {
      name: ['name', 'station', 'station_name', 'наименование станции', 'станция'],
      code: ['code', 'station_code', 'код станции', 'код'],
      short_name: ['short_name', 'shortname', 'краткое наименование', 'краткое имя'],
      railway: ['railway', 'road', 'дорога', 'жд', 'ж/д'],
      paragraph: ['paragraph', 'paragraphs', 'параграф', 'параграфы'],
      knot: ['knot', 'узел']
    }
  }
};

const IMPORT_GUIDE_OVERRIDES = {
  stations: {
    requiredFields: ['name', 'code'],
    jsonExample:
      '{"name":"Москва-Товарная","code":"200000","short_name":"Москва-Тов.","railway":"Московской ж.д. (17)","paragraph":"§ 1, § 3"}',
    xlsxExampleHeaders: ['name', 'code', 'short_name', 'railway', 'paragraph', 'knot'],
    notes: [
      'Поддерживается специальный формат nodes_map.json: stations + station_code + railway + short_name + station_paragraphs.',
      'Если станция уже существует (по code или name), запись будет обновлена.'
    ]
  },
  countries: {
    requiredFields: ['name'],
    jsonExample:
      '{"name":"Российская Федерация","short_name":"РФ","OSCM_code":"643","country_code_ISO_3166":"RU"}',
    xlsxExampleHeaders: ['name', 'short_name', 'OSCM_code', 'country_code_ISO_3166']
  },
  cargo: {
    requiredFields: ['name', 'code_ETSNG'],
    jsonExample:
      '{"name":"Уголь каменный","short_name":"Уголь","code_ETSNG":"161005","number_group":"16","name_group":"Минеральное топливо"}',
    xlsxExampleHeaders: ['name', 'short_name', 'code_ETSNG', 'number_group', 'name_group']
  },
  cargo_groups: {
    requiredFields: ['name', 'code'],
    jsonExample:
      '{"name":"Минеральное топливо","code":"16","min_load":"1","max_load":"69"}',
    xlsxExampleHeaders: ['name', 'code', 'min_load', 'max_load']
  },
  legal_entities: {
    requiredFields: ['title'],
    jsonExample:
      '{"title":"ООО Тест","inn":"7700000000","kpp":"770001001","code":"1001","short_name":"ООО Тест"}',
    xlsxExampleHeaders: ['title', 'inn', 'kpp', 'code', 'short_name']
  },
  contracts: {
    requiredFields: ['code', 'title'],
    jsonExample:
      '{"code":"CNT-001","short_name":"Контракт 001","title":"Договор на перевозку грузов"}',
    xlsxExampleHeaders: ['code', 'short_name', 'title']
  }
};

function guessRequiredFields(fields) {
  const preferred = ['name', 'title', 'code', 'short_name'];
  const required = preferred.filter((f) => fields.includes(f)).slice(0, 2);
  if (required.length) return required;
  return fields.slice(0, 2);
}

function getDictionaryImportGuide(dictKey, def, meta) {
  const fields = Object.keys(meta || {}).filter((c) => c !== 'id');
  const override = IMPORT_GUIDE_OVERRIDES[dictKey] || {};
  const requiredFields = override.requiredFields || guessRequiredFields(fields);
  const xlsxHeaders = override.xlsxExampleHeaders || fields.slice(0, 8);

  return {
    acceptedFormats: ['.json', '.xlsx'],
    requiredLanguageHint:
      'Для JSON флаги (ключи) должны быть на английском. Для XLSX заголовки могут быть на русском или английском.',
    matchingRules:
      'Сопоставление идёт по названию поля БД и по русским названиям из метаданных справочника.',
    supportedFields: fields,
    requiredFields,
    fieldLabels: def.fieldLabels || {},
    jsonTemplate: {
      format: 'array',
      example:
        override.jsonExample ||
        `{${requiredFields.map((f, i) => `"${f}":"значение${i + 1}"`).join(',')}}`
    },
    xlsxTemplate: {
      headerRow: xlsxHeaders
    },
    uploadTips: [
      'JSON: массив объектов или объект-словарь по флагам.',
      'XLSX: первая строка листа должна содержать заголовки колонок.',
      'Лишние колонки игнорируются; неизвестные флаги не загружаются.'
    ],
    exportTips: [
      'Для последующей выгрузки используйте те же заголовки/ключи, что указаны в шаблоне.',
      'Сохраните файл в UTF-8 (для JSON) или как .xlsx с первой строкой-заголовком.',
      'Для обновления существующих записей указывайте уникальные поля (например, code/name).'
    ],
    dictionaryNotes: override.notes || []
  };
}

function buildFlagMap(def, meta, dictKey, options = {}) {
  const includeRuLabels = options.includeRuLabels !== false;
  const map = new Map();
  const columns = Object.keys(meta || {}).filter((col) => {
    const lower = col.toLowerCase();
    if (lower === 'id') return false;
    if (lower === 'created_at' || lower === 'updated_at') return false;
    return true;
  });

  columns.forEach((col) => {
    map.set(normalizeFlag(col), col);
  });

  if (includeRuLabels) {
    Object.entries(def.fieldLabels || {}).forEach(([col, label]) => {
      map.set(normalizeFlag(label), col);
    });
  }

  const aliases = IMPORT_CONFIG[dictKey]?.headerAliases || {};
  Object.entries(aliases).forEach(([col, aliasList]) => {
    if (!columns.includes(col)) return;
    aliasList.forEach((a) => {
      if (!includeRuLabels && /[а-яА-ЯёЁ]/.test(String(a))) return;
      map.set(normalizeFlag(a), col);
    });
  });

  return { map, allowedColumns: columns };
}

function sanitizeRow(row, allowedColumns) {
  const clean = {};
  allowedColumns.forEach((col) => {
    if (Object.prototype.hasOwnProperty.call(row, col)) {
      clean[col] = row[col];
    }
  });
  return clean;
}

function normalizeRowTypes(row, tableMeta) {
  const out = { ...row };
  Object.keys(out).forEach((col) => {
    const value = out[col];
    const columnMeta = tableMeta?.[col];
    if (!columnMeta) return;

    const sqlType = String(columnMeta.type || '').toLowerCase();
    const isNumericType =
      sqlType.includes('int') ||
      sqlType.includes('decimal') ||
      sqlType.includes('float') ||
      sqlType.includes('double');
    const isDateType = sqlType.includes('date') || sqlType.includes('time') || sqlType.includes('year');

    if (value === '') {
      if (isNumericType || isDateType) {
        out[col] = null;
      }
      return;
    }

    if (isNumericType && typeof value === 'string') {
      const normalized = value.trim().replace(',', '.');
      if (normalized === '') {
        out[col] = null;
      } else if (!Number.isNaN(Number(normalized))) {
        out[col] = Number(normalized);
      }
    }
  });
  return out;
}

function extractVarcharLimit(sqlType) {
  const m = String(sqlType || '').toLowerCase().match(/varchar\((\d+)\)/);
  return m ? parseInt(m[1], 10) : null;
}

function validateRowBySchema(row, tableMeta) {
  const errors = [];
  Object.keys(row).forEach((col) => {
    const value = row[col];
    if (value === null || value === undefined) return;
    const columnMeta = tableMeta?.[col];
    if (!columnMeta) return;
    const sqlType = String(columnMeta.type || '').toLowerCase();
    if (sqlType.includes('varchar')) {
      const maxLen = extractVarcharLimit(sqlType);
      if (maxLen && String(value).length > maxLen) {
        errors.push(`Поле "${col}" превышает ${maxLen} символов`);
      }
    }
  });
  return { ok: errors.length === 0, errors };
}

function parseJsonRows(fileBuffer, dictKey) {
  let data;
  try {
    data = JSON.parse(fileBuffer.toString('utf8'));
  } catch (e) {
    const err = new Error('invalid_json');
    err.statusCode = 400;
    throw err;
  }

  const cfg = IMPORT_CONFIG[dictKey];
  if (cfg?.transformJsonObject) {
    const transformed = cfg.transformJsonObject(data);
    if (Array.isArray(transformed)) return transformed;
  }

  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) return data.items;
    const firstArray = Object.values(data).find((v) => Array.isArray(v));
    if (Array.isArray(firstArray)) return firstArray;
  }

  const err = new Error('unsupported_json_shape');
  err.statusCode = 400;
  throw err;
}

function parseXlsxRows(fileBuffer, flagMap) {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  if (!wb.SheetNames.length) {
    const err = new Error('xlsx_no_sheets');
    err.statusCode = 400;
    throw err;
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const headers = (rows[0] || []).map((h) => String(h || '').trim());
  const mappedColumns = headers.map((h) => flagMap.get(normalizeFlag(h)) || null);
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i] || [];
    const rowObj = {};
    mappedColumns.forEach((col, idx) => {
      if (!col) return;
      const value = raw[idx];
      if (value === undefined || value === null || value === '') return;
      rowObj[col] = typeof value === 'string' ? value.trim() : value;
    });
    if (Object.keys(rowObj).length > 0) {
      result.push(rowObj);
    }
  }

  return result;
}

function buildTemplateRows(dictKey, def, tableMeta) {
  const guide = getDictionaryImportGuide(dictKey, def, tableMeta);
  const supported = (guide.supportedFields || []).filter(
    (c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at'
  );
  const required = guide.requiredFields || [];

  const row = {};
  supported.forEach((col) => {
    row[col] = required.includes(col) ? `required_${col}` : '';
  });

  // Более наглядный пример для stations
  if (dictKey === 'stations') {
    row.name = row.name || 'Москва-Товарная';
    row.code = row.code || '200000';
    if (Object.prototype.hasOwnProperty.call(row, 'short_name')) row.short_name = 'Москва-Тов.';
    if (Object.prototype.hasOwnProperty.call(row, 'railway')) row.railway = 'Московской ж.д. (17)';
  }

  return [row];
}

async function upsertDictionaryRows(def, rows, allowedColumns, uniqueBy, tableMeta) {
  const stats = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const rawRow of rows) {
    const row = normalizeRowTypes(sanitizeRow(rawRow || {}, allowedColumns), tableMeta);
    if (!Object.keys(row).length) {
      stats.skipped += 1;
      continue;
    }
    const schemaValidation = validateRowBySchema(row, tableMeta);
    if (!schemaValidation.ok) {
      stats.skipped += 1;
      if (stats.errors.length < 20) {
        stats.errors.push({
          reason: 'schema_validation_failed',
          details: schemaValidation.errors,
          sample: {
            name: row.name || null,
            code: row.code || null
          }
        });
      }
      continue;
    }

    const uniqueCols = (uniqueBy || []).filter((c) => row[c] !== undefined && row[c] !== '');
    if (!uniqueCols.length) {
      const fallback = ['code', 'name', 'title'].find((c) => row[c] !== undefined && row[c] !== '');
      if (fallback) uniqueCols.push(fallback);
    }
    if (!uniqueCols.length) {
      stats.skipped += 1;
      continue;
    }

    const whereSql = uniqueCols.map((c) => `\`${c}\` = :u_${c}`).join(' AND ');
    const replacements = {};
    uniqueCols.forEach((c) => {
      replacements[`u_${c}`] = row[c];
    });

    try {
      const [existing] = await sequelize.query(
        `SELECT id FROM \`${def.table}\` WHERE ${whereSql} LIMIT 1`,
        { replacements }
      );

      if (existing.length) {
        const updateData = { ...row };
        delete updateData.id;
        if (!Object.keys(updateData).length) {
          stats.skipped += 1;
          continue;
        }
        const setSql = Object.keys(updateData)
          .map((c) => `\`${c}\` = :${c}`)
          .join(', ');
        await sequelize.query(`UPDATE \`${def.table}\` SET ${setSql} WHERE id = :id`, {
          replacements: { ...updateData, id: existing[0].id }
        });
        stats.updated += 1;
        continue;
      }

      const insertData = { ...row };
      delete insertData.id;
      if (!Object.keys(insertData).length) {
        stats.skipped += 1;
        continue;
      }
      const columnsSql = Object.keys(insertData)
        .map((c) => `\`${c}\``)
        .join(', ');
      const valuesSql = Object.keys(insertData)
        .map((c) => `:${c}`)
        .join(', ');
      await sequelize.query(
        `INSERT INTO \`${def.table}\` (${columnsSql}) VALUES (${valuesSql})`,
        { replacements: insertData }
      );
      stats.inserted += 1;
    } catch (rowError) {
      stats.skipped += 1;
      if (stats.errors.length < 20) {
        stats.errors.push({
          reason: 'db_error',
          message: rowError?.message || 'Ошибка БД при обработке строки',
          sample: {
            name: row.name || null,
            code: row.code || null
          }
        });
      }
    }
  }

  return stats;
}

async function getTableMeta(dictKey) {
  const def = DICTIONARIES[dictKey];
  if (!def) {
    const err = new Error('unknown_dictionary');
    err.statusCode = 400;
    throw err;
  }
  const cacheKey = def.table;
  if (tableMetaCache.has(cacheKey)) {
    return tableMetaCache.get(cacheKey);
  }
  const meta = await queryInterface.describeTable(def.table);
  tableMetaCache.set(cacheKey, meta);
  return meta;
}

/**
 * Регистрация маршрутов для работы со справочниками.
 *
 * Доступ:
 *  - только пользователи с ролью dictionary-admin или app-admin.
 */
function registerDictionaryRoutes(app) {
  const router = express.Router();

  // Список доступных справочников
  router.get(
    '/api/dictionaries',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    (req, res) => {
      const items = Object.entries(DICTIONARIES).map(([key, def]) => ({
        key,
        label: def.label,
        table: def.table
      }));
      res.json(items);
    }
  );

  // Метаданные полей таблицы
  router.get(
    '/api/dictionaries/:key/meta',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const meta = await getTableMeta(dictKey);
        res.json({
          columns: meta,
          fieldLabels: def.fieldLabels || {},
          fieldOrder: def.fieldOrder || null,
          importGuide: getDictionaryImportGuide(dictKey, def, meta)
        });
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({
            error: error.message
          });
        }
        console.error('Error getting dictionary meta:', error);
        return res.status(500).json({
          error: 'dictionary_meta_failed',
          message: 'Не удалось получить структуру справочника.'
        });
      }
    }
  );

  // Скачать шаблон файла для импорта справочника
  router.get(
    '/api/dictionaries/:key/template',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const format = String(req.query.format || 'json').toLowerCase();
        if (format !== 'json' && format !== 'xlsx') {
          return res.status(400).json({
            error: 'bad_format',
            message: 'Формат шаблона должен быть json или xlsx.'
          });
        }

        const tableMeta = await getTableMeta(dictKey);
        const rows = buildTemplateRows(dictKey, def, tableMeta);
        const base = `dictionary-template-${dictKey}`;

        if (format === 'json') {
          const json = JSON.stringify(rows, null, 2);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${base}.json"`);
          return res.send(json);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
        XLSX.utils.book_append_sheet(wb, ws, 'template');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
        return res.send(buffer);
      } catch (error) {
        console.error('Error creating dictionary template:', error);
        return res.status(500).json({
          error: 'dictionary_template_failed',
          message: 'Не удалось сформировать шаблон файла.'
        });
      }
    }
  );

  // Получить строки справочника
  router.get(
    '/api/dictionaries/:key/rows',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const offset = parseInt(req.query.offset, 10) || 0;

        const [rows] = await sequelize.query(
          `SELECT * FROM \`${def.table}\` ORDER BY id LIMIT :limit OFFSET :offset`,
          {
            replacements: { limit, offset }
          }
        );

        res.json({ items: rows, limit, offset });
      } catch (error) {
        console.error('Error loading dictionary rows:', error);
        res.status(500).json({
          error: 'dictionary_rows_failed',
          message: 'Не удалось загрузить данные справочника.'
        });
      }
    }
  );

  // Импорт данных справочника из JSON/XLSX
  router.post(
    '/api/dictionaries/:key/import',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    upload.single('file'),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        if (!req.file) {
          return res.status(400).json({
            error: 'file_required',
            message: 'Файл не передан.'
          });
        }

        const ext = path.extname(req.file.originalname || '').toLowerCase();
        if (ext !== '.json' && ext !== '.xlsx') {
          return res.status(400).json({
            error: 'unsupported_file_type',
            message: 'Поддерживаются только файлы .json и .xlsx.'
          });
        }

        const tableMeta = await getTableMeta(dictKey);
        const { map: xlsxFlagMap, allowedColumns } = buildFlagMap(def, tableMeta, dictKey, {
          includeRuLabels: true
        });
        const { map: jsonFlagMap } = buildFlagMap(def, tableMeta, dictKey, {
          includeRuLabels: false
        });
        let parsedRows = [];

        if (ext === '.json') {
          parsedRows = parseJsonRows(req.file.buffer, dictKey);
          parsedRows = parsedRows.map((row) => {
            const out = {};
            Object.entries(row || {}).forEach(([key, value]) => {
              const mapped = jsonFlagMap.get(normalizeFlag(key)) || key;
              out[mapped] = value;
            });
            return out;
          });
        } else {
          parsedRows = parseXlsxRows(req.file.buffer, xlsxFlagMap);
        }

        const uniqueBy = IMPORT_CONFIG[dictKey]?.uniqueBy || [];
        const stats = await upsertDictionaryRows(
          def,
          parsedRows,
          allowedColumns,
          uniqueBy,
          tableMeta
        );

        return res.json({
          ok: true,
          dictionary: dictKey,
          file: req.file.originalname,
          stats
        });
      } catch (error) {
        console.error('Error importing dictionary file:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({
          error: 'dictionary_import_failed',
          message:
            status === 400
              ? 'Ошибка структуры файла или формата данных.'
              : 'Не удалось импортировать данные справочника.'
        });
      }
    }
  );

  // Создать строку в справочнике
  router.post(
    '/api/dictionaries/:key/rows',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const meta = await getTableMeta(dictKey);
        const body = req.body || {};

        // Разрешённые поля: все, кроме id и авто‑полей (created_at/updated_at и т.п.)
        const allowedColumns = Object.keys(meta).filter((col) => {
          const lower = col.toLowerCase();
          if (lower === 'id') return false;
          if (lower === 'created_at' || lower === 'updated_at') return false;
          return true;
        });

        const data = {};
        allowedColumns.forEach((col) => {
          if (Object.prototype.hasOwnProperty.call(body, col)) {
            data[col] = body[col];
          }
        });

        if (Object.keys(data).length === 0) {
          return res.status(400).json({
            error: 'no_fields',
            message: 'Не переданы данные для создания записи.'
          });
        }

        const columnsSql = Object.keys(data)
          .map((c) => `\`${c}\``)
          .join(', ');
        const valuesPlaceholders = Object.keys(data)
          .map((c) => `:${c}`)
          .join(', ');

        const [result] = await sequelize.query(
          `INSERT INTO \`${def.table}\` (${columnsSql}) VALUES (${valuesPlaceholders})`,
          {
            replacements: data
          }
        );

        const insertedId =
          result && typeof result.insertId === 'number'
            ? result.insertId
            : null;

        if (!insertedId) {
          return res.status(201).json({ ok: true });
        }

        const [rows] = await sequelize.query(
          `SELECT * FROM \`${def.table}\` WHERE id = :id`,
          { replacements: { id: insertedId } }
        );

        return res.status(201).json(rows[0] || { id: insertedId });
      } catch (error) {
        console.error('Error creating dictionary row:', error);
        return res.status(500).json({
          error: 'dictionary_create_failed',
          message: 'Не удалось создать запись справочника.'
        });
      }
    }
  );

  // Обновить строку справочника
  router.patch(
    '/api/dictionaries/:key/rows/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ error: 'bad_id' });
        }

        const meta = await getTableMeta(dictKey);
        const body = req.body || {};

        const allowedColumns = Object.keys(meta).filter((col) => {
          const lower = col.toLowerCase();
          if (lower === 'id') return false;
          if (lower === 'created_at' || lower === 'updated_at') return false;
          return true;
        });

        const data = {};
        allowedColumns.forEach((col) => {
          if (Object.prototype.hasOwnProperty.call(body, col)) {
            data[col] = body[col];
          }
        });

        if (Object.keys(data).length === 0) {
          return res.status(400).json({
            error: 'no_fields',
            message: 'Не переданы данные для обновления записи.'
          });
        }

        const setSql = Object.keys(data)
          .map((c) => `\`${c}\` = :${c}`)
          .join(', ');

        await sequelize.query(
          `UPDATE \`${def.table}\` SET ${setSql} WHERE id = :id`,
          {
            replacements: { ...data, id }
          }
        );

        const [rows] = await sequelize.query(
          `SELECT * FROM \`${def.table}\` WHERE id = :id`,
          { replacements: { id } }
        );

        return res.json(rows[0] || { id });
      } catch (error) {
        console.error('Error updating dictionary row:', error);
        return res.status(500).json({
          error: 'dictionary_update_failed',
          message: 'Не удалось обновить запись справочника.'
        });
      }
    }
  );

  // Удалить строку справочника
  router.delete(
    '/api/dictionaries/:key/rows/:id',
    keycloakAuth.verifyToken(),
    keycloakAuth.requireAnyRealmRole(['dictionary-admin', 'app-admin']),
    async (req, res) => {
      try {
        const dictKey = req.params.key;
        const def = DICTIONARIES[dictKey];
        if (!def) {
          return res.status(400).json({ error: 'unknown_dictionary' });
        }
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ error: 'bad_id' });
        }

        await sequelize.query(
          `DELETE FROM \`${def.table}\` WHERE id = :id LIMIT 1`,
          { replacements: { id } }
        );

        return res.json({ ok: true });
      } catch (error) {
        console.error('Error deleting dictionary row:', error);
        return res.status(500).json({
          error: 'dictionary_delete_failed',
          message: 'Не удалось удалить запись справочника.'
        });
      }
    }
  );

  app.use(router);
}

module.exports = {
  registerDictionaryRoutes,
  DICTIONARIES
};

