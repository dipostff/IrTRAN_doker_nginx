/**
 * Учебные справочники (как на фронте: cumulativeStatementCatalogs, fillingStatementCatalogs).
 * Используются в PDF, когда в payload хранятся id строк, а не подписи.
 */

function listToMap(items, idKey = 'id', labelFn) {
  const m = Object.create(null);
  for (const row of items || []) {
    const id = row[idKey];
    if (id == null) continue;
    m[String(id)] = labelFn(row);
  }
  return m;
}

const CUMULATIVE_SOURCE_DOCUMENTS = [
  { id: 'invoice', name: 'Накладная' },
  { id: 'filling_statement', name: 'Ведомость подачи и уборки' },
  { id: 'reminder', name: 'Памятка приемосдатчика' },
  { id: 'manual', name: 'Ручной ввод' },
  { id: 'cumulative_statement', name: 'Накопительная ведомость' },
  { id: 'common_act', name: 'Акт общей формы (ГУ-23)' },
  { id: 'commercial_act', name: 'Коммерческий акт (ГУ-22)' },
];

const CUMULATIVE_FEE_ARTICLES = [
  { id: 'A101', code: 'A101', name: 'Сбор за подачу/уборку' },
  { id: 'A102', code: 'A102', name: 'Сбор за пользование ПП' },
  { id: 'A201', code: 'A201', name: 'Плата за нахождение' },
  { id: 'A301', code: 'A301', name: 'Штраф' },
];

const CUMULATIVE_ADDITIONAL_CODES = [
  { id: 'D01', code: 'D01', name: 'Ночная смена' },
  { id: 'D02', code: 'D02', name: 'Выходной/праздничный день' },
  { id: 'D03', code: 'D03', name: 'Без дополнительных условий' },
];

const CUMULATIVE_NDS_OPTIONS = [
  { id: 'nds_20', name: 'С НДС 20%' },
  { id: 'nds_12', name: 'С НДС 12%' },
  { id: 'nds_0', name: 'Без НДС' },
];

const TARIFF_PLAN_OPTIONS = [
  { id: 'tp_2024_base', name: 'Базовый тарифный план 2024 (п/у)' },
  { id: 'tp_2024_reg', name: 'Региональный план с надбавками' },
  { id: 'tp_contract', name: 'По условиям договора (индивидуальный)' },
];

const STATEMENT_NUMBERING_TYPES = [
  { id: 'six', name: 'Шесть знаков (2 — месяц, 1 — пятидневка, 3 — порядковый номер)' },
  { id: 'seq', name: 'Сквозная нумерация за год' },
  { id: 'contract', name: 'По номеру договора и порядковому номеру' },
];

const TRACK_BRANCH_OPTIONS = [
  { id: 'branch_owner', name: 'Ветвевладельцу' },
  { id: 'carrier', name: 'Перевозчику' },
  { id: 'joint', name: 'Совместная инфраструктура' },
];

const FILLING_OPERATION_OPTIONS = [
  { id: 'delivery', name: 'Подача' },
  { id: 'removal', name: 'Уборка' },
  { id: 'load', name: 'Погрузка' },
  { id: 'unload', name: 'Выгрузка' },
  { id: 'paired', name: 'Сдвоенные операции' },
];

const NORM_TIME_ON_TRACK_OPTIONS = [
  { id: 'z_koo4', name: 'Код «Ж» (КОО-4), 72 ч' },
  { id: 'std_48', name: 'Стандарт 48 ч' },
  { id: 'std_24', name: 'Ускоренный 24 ч' },
];

const TURNOVER_OPERATION_OPTIONS = [
  { id: 'load', name: 'Погрузка' },
  { id: 'unload', name: 'Выгрузка' },
  { id: 'paired', name: 'Сдвоенные операции' },
];

const STATIC_MAPS = {
  source_document_type: listToMap(CUMULATIVE_SOURCE_DOCUMENTS, 'id', (r) => r.name),
  fee_article_id: listToMap(CUMULATIVE_FEE_ARTICLES, 'id', (r) => `${r.code} — ${r.name}`),
  additional_code_id: listToMap(CUMULATIVE_ADDITIONAL_CODES, 'id', (r) => `${r.code} — ${r.name}`),
  nds_option_id: listToMap(CUMULATIVE_NDS_OPTIONS, 'id', (r) => r.name),
  tariff_plan_id: listToMap(TARIFF_PLAN_OPTIONS, 'id', (r) => r.name),
  track_branch_id: listToMap(TRACK_BRANCH_OPTIONS, 'id', (r) => r.name),
  statement_numbering_type: listToMap(STATEMENT_NUMBERING_TYPES, 'id', (r) => r.name),
  operation: listToMap(FILLING_OPERATION_OPTIONS, 'id', (r) => r.name),
  id_norm_time: listToMap(NORM_TIME_ON_TRACK_OPTIONS, 'id', (r) => r.name),
  turnover_operation: listToMap(TURNOVER_OPERATION_OPTIONS, 'id', (r) => r.name),
};

function resolveStaticField(fieldKey, value) {
  if (value == null || value === '') return null;
  const map = STATIC_MAPS[fieldKey];
  if (!map) return null;
  const label = map[String(value)];
  return label != null ? `${label} (${value})` : null;
}

module.exports = {
  STATIC_MAPS,
  resolveStaticField,
};
