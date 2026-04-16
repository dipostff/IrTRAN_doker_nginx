const fs = require('fs');
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');
const { PDFDocument, rgb } = require('pdf-lib');
const { createPdfResolveContext } = require('./documentPdfResolve');

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const FOOTER_H = 36;

const FONT_PATHS = [
  path.join(__dirname, '../../../assets/fonts/NotoSans-Regular.ttf'),
  path.join(__dirname, '../../../assets/fonts/DejaVuSans.ttf'),
];

const DOWNTIME_TYPE_LABELS = {
  start: 'Начало простоя',
  end: 'Окончание простоя',
};

/** Подписи полей payload (общие и по типам документов). */
const PAYLOAD_KEY_LABELS = {
  id: 'Номер документа (в форме)',
  signed: 'Подписан',
  createdAt: 'Дата создания (в форме)',
  id_station: 'Станция (ID)',
  act_date: 'Дата составления акта',
  downtime_type: 'Начало/окончание простоя',
  description: 'Описание обстоятельств',
  supplement: 'Дополнение к описанию',
  persons: 'Присутствовавшие лица',
  wagons: 'Вагоны и отправки',
  special_marks: 'Специальные отметки',
  attached_documents: 'Прилагаемые документы',
  backendId: 'ID в системе',
  vehicle_number: 'Номер вагона/контейнера',
  id_transportation: 'ID перевозки',
  shipment_label: 'Номер отправки',
  downtime_start: 'Начало простоя',
  downtime_end: 'Окончание простоя',
  prior_act_number: 'Номер акта на начало простоя',
  downtime_days: 'Кол-во суток простоя',
  position: 'Должность',
  full_name: 'ФИО',
  type: 'Тип',
  mark: 'Отметка',
  note: 'Примечание',
  document: 'Наименование документа',
  number: 'Номер',
  /* Коммерческий акт (ГУ-22) */
  train_number: 'Номер поезда',
  arrival_date: 'Дата прибытия',
  arrival_time: 'Время прибытия',
  id_speed_type: 'Вид отправки (ID)',
  accompaniment: 'Сопровождение',
  invoice_number: 'Номер накладной',
  station_departure: 'Станция отправления',
  station_destination: 'Станция назначения',
  shipper_name: 'Грузоотправитель',
  shipper_okpo: 'ОКПО грузоотправителя',
  receiver_name: 'Грузополучатель',
  receiver_okpo: 'ОКПО грузополучателя',
  carrier_name: 'Перевозчик',
  declared_value: 'Заявленная ценность',
  cargo_loaded_means: 'Груз погружен (транспортные средства)',
  mass_determined_label: 'Масса (по документам/фактически)',
  loaded_by_whom: 'Погружено кем',
  loaded_how: 'Погружено как',
  sender_tare_marks: 'Отметки о состоянии тары отправителя',
  commercial_wagons: 'Вагоны',
  commercial_containers: 'Контейнеры',
  zpu_rows: 'ЗПУ (пломбы и др.)',
  cargo_by_docs: 'Груз по документам',
  cargo_actual: 'Груз по факту',
  expertise_act_number: 'Номер акта экспертизы',
  expertise_act_date: 'Дата акта экспертизы',
  cargo_discrepancy_description: 'Описание расхождений по грузу',
  expertise_conclusion: 'Заключение экспертизы',
  wagon_number: 'Номер вагона',
  stock_type: 'Род подвижного состава',
  capacity: 'Вместимость',
  condition: 'Состояние',
  tech_act: 'Тех. акт',
  tech_act_date: 'Дата тех. акта',
  ownership: 'Принадлежность',
  container_number: 'Номер контейнера',
  size_type: 'Размер/тип',
  vehicle_ref: 'Вагон/контейнер',
  place: 'Место',
  control_marks: 'Контрольные отметки',
  cancellation: 'Аннулирование',
  damage_traces: 'Следы повреждений',
  brand: 'Марка',
  places_count: 'Количество мест',
  package_type: 'Вид упаковки',
  cargo_name: 'Наименование груза',
  total_mass_kg: 'Масса всего, кг',
  mass_per_place: 'Масса на место',
  damage_note: 'Повреждения / примечание',
  /* Памятка */
  reminder_type: 'Тип памятки',
  id_owner: 'Владелец пути (ID)',
  place_of_delivery: 'Место подачи',
  locomotive_by: 'Локомотив (ж/д / владелец)',
  train_index: 'Индекс поезда',
  wagon_lines: 'Строки по вагонам',
  change_history: 'История изменений',
  cargo_operation: 'Грузовая операция',
  delivery_date: 'Дата подачи',
  delivery_time: 'Время подачи',
  removal_date: 'Дата уборки',
  removal_time: 'Время уборки',
  /* Ведомость подачи и уборки */
  id_contract: 'Договор (ID)',
  id_payer: 'Плательщик (ID)',
  place_of_calculation: 'Место расчёта',
  place_of_transfer: 'Место передачи',
  total_sum: 'Итоговая сумма',
  form2_number: 'Номер формы 2',
  tariff_plan_id: 'Тарифный план',
  track_branch_id: 'Перегон / путь',
  statement_numbering_type: 'Тип нумерации ведомости',
  statement_heading_date: 'Дата шапки ведомости',
  statement_number: 'Номер ведомости',
  period_from: 'Период с',
  period_to: 'Период по',
  unpaid_time: 'Неплачиваемое время',
  wagon_cycle_time: 'Время оборота вагона',
  wagon_cycle_paired: 'Парный оборот',
  expanded_track_length_m: 'Расширенная длина пути, м',
  cleaning_reminders: 'Памятки на уборку',
  wagons_by_reminders: 'Вагоны по памяткам',
  fee_delivery_rows: 'Сборы (подача / уборка)',
  delivery_summary: 'Итоги по подаче',
  pp_usage_summary: 'Итоги пользования ПП',
  pp_usage_days: 'Сутки пользования ПП',
  fine: 'Штрафы и пени',
  reminder_number: 'Номер памятки',
  reminder_date: 'Дата памятки',
  wagon_turnover: 'Оборот вагона',
  cleanup_time: 'Время уборки',
  extra_maneuver_min: 'Доп. манёвры, мин',
  id_locomotive_station: 'Станция локомотива (ID)',
  maneuver_fee: 'Сбор за манёвры',
  locomotive_fee: 'Сбор за локомотив',
  state: 'Состояние',
  id_counterparty: 'Контрагент (ID)',
  reminder_delivery_number: 'Памятка (подача)',
  reminder_cleaning_number: 'Памятка (уборка)',
  id_ownership: 'Собственность (ID)',
  id_rolling_type: 'Род подвижного состава (ID)',
  operation_code: 'Код операции',
  id_cargo: 'Груз (ID)',
  delivery_dt: 'Подача (дата/время)',
  operation_end_dt: 'Окончание операции',
  under_op_time_manual: 'Время под операцией (вручную)',
  id_norm_time: 'Норма времени (ID)',
  tech_time_pop: 'Техвремя ПОП',
  turnover_operation: 'Операция оборота',
  payment_amount: 'Сумма оплаты',
  fine_amount: 'Штраф',
  fine_to_notice: 'Штраф к уведомлению',
  presence_fee_row: 'Сбор за нахождение (строка)',
  row_total: 'Итого по строке',
  payment_multiplicity: 'Кратность оплаты',
  time_total_h: 'Время всего, ч',
  norm_hours_display: 'Норма, ч (отображ.)',
  cargo_op_hours: 'Часы груз. опер.',
  calc_under_op_h: 'Под операцией, ч',
  time_calc_payment_h: 'Часы для расчёта оплаты',
  time_calc_fine_h: 'Часы для расчёта штрафа',
  time_calc_presence_h: 'Часы для расчёта нахождения',
  operation: 'Операция',
  op_date: 'Дата операции',
  op_time: 'Время операции',
  wagon_count: 'Количество вагонов',
  source: 'Источник',
  clarification: 'Уточнение',
  wagons_for_calc: 'Вагоны для расчёта',
  rate: 'Ставка',
  sum: 'Сумма',
  delivery_place: 'Место подачи',
  accrued: 'Начислено',
  collected: 'Взыскано',
  from_account: 'Со счёта',
  by_notification: 'По уведомлению',
  notification_no: '№ уведомления',
  usage_fee: 'Сбор за пользование',
  presence_fee: 'Сбор за нахождение',
  coeff_safety: 'Коэфф. безопасность',
  coeff_tax: 'Коэфф. налог',
  coeff_cap: 'Коэфф. капитал',
  sum_payment_wo_nonindexed: 'Сумма без индексации',
  sum_wo_safety: 'Сумма без безопасности',
  sum_wo_tax: 'Сумма без налога',
  sum_wo_extra: 'Сумма без доп.',
  income_safety: 'Доход безопасность',
  income_tax: 'Доход налог',
  income_cap: 'Доход капитал',
  delivery_fee: 'Сбор за подачу',
  shunting: 'Маневры',
  mileage: 'Пробег',
  total: 'Всего',
  penalty_to_notice: 'Пени к уведомлению',
  /* Накопительная ведомость */
  document_number: 'Номер документа',
  manual_number: 'Номер задан вручную',
  arbitration_court: 'Арбитражный суд',
  id_carrier_org: 'Организация-перевозчик (ID)',
  total_to_pay: 'Всего к оплате',
  head_signer_name: 'Руководитель (ФИО)',
  fee_rows: 'Строки сборов',
  fee_date: 'Дата сбора',
  source_document_type: 'Тип исходного документа',
  source_document_number: 'Номер исходного документа',
  source_document_state: 'Состояние исходного документа',
  fee_article_id: 'Статья сбора (ID)',
  additional_code_id: 'Доп. код (ID)',
  wagon_or_container_number: 'Вагон/контейнер',
  amount_rub: 'Сумма, руб.',
  amount_kzt: 'Сумма, KZT',
  nds_option_id: 'Вариант НДС',
  nds_rate: 'Ставка НДС',
  nds_amount: 'Сумма НДС',
  calculated_amount: 'Сумма с НДС',
  sum_wo_nonindexed: 'Сумма без индексации',
  /* Накладная */
  invoice_type: 'Тип накладной',
  id_blank_type: 'Тип бланка (ID)',
  input_by_destination: 'Ввод по назначению',
  id_send_type: 'Вид отправки (ID)',
  id_shipper: 'Грузоотправитель (ID)',
  shipper_addr: 'Адрес грузоотправителя',
  id_station_departure: 'Станция отправления (ID)',
  id_station_destination: 'Станция назначения (ID)',
  departure_railway_path: 'Ж/д путь отправления',
  destination_railway_path: 'Ж/д путь назначения',
  id_place_of_payment: 'Место оплаты (ID)',
  id_request_transportation: 'Заявка на перевозку (ID)',
  id_submission_schedule: 'График подачи (ID)',
  cargo_work_type: 'Вид грузовой работы',
  id_country_departure: 'Страна отправления (ID)',
  id_country_destination: 'Страна назначения (ID)',
  payment_form: 'Форма оплаты',
  container_capacity_tons: 'Вместимость контейнера, т',
  id_receiver: 'Грузополучатель (ID)',
  receiver_addr: 'Адрес грузополучателя',
  id_rolling_stock_type: 'Род подвижного состава (ID)',
  goods: 'Грузовые позиции',
  route_rows: 'Маршрут следования',
  containers: 'Контейнеры',
  conductors: 'Проводники',
  wagon_marks: 'Отметки по вагонам',
  loading_time_msk: 'Время погрузки (МСК)',
  loading_time_local: 'Время погрузки (местн.)',
  mass_determination_method: 'Способ определения массы',
  cargo_secured_according_to: 'Крепление груза по',
  technical_conditions: 'Технические условия',
  loading_finished: 'Погрузка завершена',
  package: 'Упаковка',
  places: 'Места',
  packages: 'Мест / пакетов',
  planned_weight_kg: 'Плановая масса, кг',
  gng_name: 'Наименование по ГНГ',
  gng_code: 'Код ГНГ',
  danger: 'Опасность',
  id_country: 'Страна (ID)',
  distance: 'Расстояние',
  payer_code: 'Код плательщика',
  capacity_tons: 'Вместимость, т',
  net_kg: 'Масса нетто, кг',
  gross_kg: 'Масса брутто, кг',
  zpu_count: 'Количество ЗПУ',
  fio: 'ФИО',
  passport_series: 'Серия паспорта',
  passport_number: 'Номер паспорта',
  mission_id: 'Командировка (ID)',
};

function payloadKeyLabel(key) {
  return PAYLOAD_KEY_LABELS[key] || key.replace(/_/g, ' ');
}

function loadFontBytes() {
  for (const p of FONT_PATHS) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch (_) {
      /* next */
    }
  }
  return null;
}

async function embedCyrillicFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const bytes = loadFontBytes();
  if (!bytes) {
    throw new Error(
      'Не найден файл кириллического шрифта (ожидается assets/fonts/NotoSans-Regular.ttf)'
    );
  }
  return pdfDoc.embedFont(bytes, { subset: true });
}

function normalizeText(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function formatDowntimeType(v) {
  if (v == null || v === '') return '—';
  const id = typeof v === 'object' && v !== null ? v.id ?? v.value : v;
  return DOWNTIME_TYPE_LABELS[id] || String(id);
}

/** Ячейка PDF: подстановка справочника по ключу поля payload (если есть resolveCtx). */
function cellDisplay(resolveCtx, fieldKey, v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
  if (resolveCtx && fieldKey) {
    const r = resolveCtx.formatField(fieldKey, v);
    if (r != null) return r;
  }
  return String(v);
}

function formatPayloadValue(val, depth = 0, fieldKey = null, resolveCtx = null, documentType = '') {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
  if (typeof val === 'number' && Number.isFinite(val)) {
    if (resolveCtx && fieldKey) {
      const r = resolveCtx.formatField(fieldKey, val);
      if (r != null) return r;
    }
    return String(val);
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (!t) return '—';
    if (resolveCtx && fieldKey) {
      const r = resolveCtx.formatField(fieldKey, t);
      if (r != null) return r;
    }
    return t;
  }
  if (depth > 5) return '…';
  if (Array.isArray(val)) {
    if (!val.length) return '—';
    return val
      .map((item, i) => {
        const inner = formatPayloadValue(item, depth + 1, null, resolveCtx, documentType);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return `${i + 1}. ${inner.replace(/\n/g, '\n   ')}`;
        }
        return `${i + 1}. ${inner}`;
      })
      .join('\n');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${payloadKeyLabel(k)}: ${formatPayloadValue(v, depth + 1, k, resolveCtx, documentType)}`)
      .join('\n');
  }
  return String(val);
}

function wrapLine(font, text, maxWidth, fontSize) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const w = words[i];
    const trial = `${current} ${w}`;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      current = trial;
    } else {
      lines.push(current);
      current = w;
    }
  }
  lines.push(current);
  return lines;
}

function wrapParagraph(font, text, maxWidth, fontSize) {
  const raw = normalizeText(text);
  if (!raw.trim()) return [''];
  const out = [];
  for (const paragraph of raw.split('\n')) {
    if (!paragraph.trim()) {
      out.push('');
      continue;
    }
    const chunks = wrapLine(font, paragraph, maxWidth, fontSize);
    out.push(...chunks);
  }
  return out.length ? out : [''];
}

function createLayout(pdfDoc, font, formatContext = null) {
  const resolveCtx = formatContext?.resolveCtx ?? null;
  const documentType = formatContext?.documentType ?? '';
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const contentWidth = PAGE_W - 2 * MARGIN;
  let pageIndex = 0;

  function fmtPayload(val, depth = 0, key = null) {
    return formatPayloadValue(val, depth, key, resolveCtx, documentType);
  }

  function drawFooter() {
    const label = `Стр. ${pageIndex + 1}`;
    const size = 9;
    const w = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: (PAGE_W - w) / 2,
      y: 24,
      size,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  function newPage() {
    drawFooter();
    pageIndex += 1;
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function ensureSpace(need) {
    if (y - need < MARGIN + FOOTER_H) {
      newPage();
    }
  }

  function drawTextLine(text, size, opts = {}) {
    const { boldColor = rgb(0, 0, 0), x = MARGIN } = opts;
    ensureSpace(size + 4);
    page.drawText(text, { x, y, size, font, color: boldColor });
    y -= size + (opts.gapAfter ?? 4);
  }

  function drawParagraphBlock(text, size, lineGap = 3) {
    const lines = wrapParagraph(font, text, contentWidth, size);
    const blockH = lines.length * (size + lineGap);
    ensureSpace(blockH + 6);
    for (const line of lines) {
      page.drawText(line || ' ', { x: MARGIN, y, size, font, color: rgb(0, 0, 0) });
      y -= size + lineGap;
    }
    y -= 4;
  }

  function drawLabeledBlock(label, value, labelSize = 10, valueSize = 10, valueFieldKey = null) {
    ensureSpace(labelSize + 8);
    page.drawText(label, { x: MARGIN, y, size: labelSize, font, color: rgb(0.15, 0.15, 0.15) });
    y -= labelSize + 2;
    drawParagraphBlock(fmtPayload(value, 0, valueFieldKey), valueSize);
  }

  function finish() {
    drawFooter();
  }

  return {
    getPage: () => page,
    contentWidth,
    fmtPayload,
    ensureSpace,
    newPage,
    drawTextLine,
    drawParagraphBlock,
    drawLabeledBlock,
    getY: () => y,
    setY: (v) => {
      y = v;
    },
    bumpY: (delta) => {
      y += delta;
    },
    finish,
  };
}

/**
 * Простой PDF: заголовок и плоские поля (значения через formatPayloadValue).
 */
async function buildSimpleFieldsPdf(title, fields) {
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font);

  L.drawTextLine(normalizeText(title), 14, { gapAfter: 10 });
  for (const [k, v] of Object.entries(fields)) {
    const label = typeof k === 'string' && k.includes(':') ? k : `${k}:`;
    L.drawTextLine(label, 10, { gapAfter: 2 });
    L.drawParagraphBlock(formatPayloadValue(v), 10);
  }
  L.finish();
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const SKIP_GENERIC_KEYS = new Set(['backendId']);

const PRIORITY_COMMON_ACT = [
  'id',
  'id_station',
  'act_date',
  'downtime_type',
  'persons',
  'wagons',
  'description',
  'supplement',
  'special_marks',
  'attached_documents',
  'signed',
];

const PRIORITY_COMMERCIAL_ACT = [
  'id',
  'train_number',
  'arrival_date',
  'arrival_time',
  'id_speed_type',
  'accompaniment',
  'invoice_number',
  'station_departure',
  'station_destination',
  'shipper_name',
  'shipper_okpo',
  'receiver_name',
  'receiver_okpo',
  'carrier_name',
  'declared_value',
  'cargo_loaded_means',
  'mass_determined_label',
  'loaded_by_whom',
  'loaded_how',
  'sender_tare_marks',
  'commercial_wagons',
  'commercial_containers',
  'zpu_rows',
  'cargo_by_docs',
  'cargo_actual',
  'expertise_act_number',
  'expertise_act_date',
  'cargo_discrepancy_description',
  'expertise_conclusion',
  'signed',
];

const PRIORITY_REMINDER = [
  'id',
  'reminder_type',
  'id_station',
  'id_owner',
  'place_of_delivery',
  'locomotive_by',
  'train_index',
  'wagon_lines',
  'change_history',
  'signed',
];

const PRIORITY_FILLING_STATEMENT = [
  'id',
  'id_station',
  'id_contract',
  'id_owner',
  'place_of_calculation',
  'id_payer',
  'place_of_transfer',
  'total_sum',
  'form2_number',
  'tariff_plan_id',
  'track_branch_id',
  'statement_numbering_type',
  'statement_heading_date',
  'statement_number',
  'period_from',
  'period_to',
  'unpaid_time',
  'wagon_cycle_time',
  'wagon_cycle_paired',
  'expanded_track_length_m',
  'cleaning_reminders',
  'wagons_by_reminders',
  'fee_delivery_rows',
  'delivery_summary',
  'pp_usage_summary',
  'pp_usage_days',
  'fine',
  'change_history',
  'signed',
];

const PRIORITY_CUMULATIVE_STATEMENT = [
  'id',
  'document_number',
  'manual_number',
  'period_from',
  'period_to',
  'arbitration_court',
  'id_carrier_org',
  'place_of_calculation',
  'id_payer',
  'total_to_pay',
  'head_signer_name',
  'fee_rows',
  'signed',
];

const PRIORITY_INVOICE = [
  'id',
  'invoice_type',
  'id_blank_type',
  'input_by_destination',
  'id_send_type',
  'id_shipper',
  'shipper_addr',
  'id_station_departure',
  'id_station_destination',
  'departure_railway_path',
  'destination_railway_path',
  'id_speed_type',
  'id_place_of_payment',
  'id_request_transportation',
  'id_submission_schedule',
  'cargo_work_type',
  'id_country_departure',
  'id_country_destination',
  'payment_form',
  'container_capacity_tons',
  'id_receiver',
  'receiver_addr',
  'id_rolling_stock_type',
  'id_ownership',
  'goods',
  'route_rows',
  'special_marks',
  'attached_documents',
  'containers',
  'wagons',
  'conductors',
  'wagon_marks',
  'loading_time_msk',
  'loading_time_local',
  'mass_determination_method',
  'cargo_secured_according_to',
  'technical_conditions',
  'loading_finished',
  'signed',
];

const PRIORITY_BY_DOCUMENT_TYPE = {
  common_act: PRIORITY_COMMON_ACT,
  commercial_act: PRIORITY_COMMERCIAL_ACT,
  reminder: PRIORITY_REMINDER,
  filling_statement: PRIORITY_FILLING_STATEMENT,
  cumulative_statement: PRIORITY_CUMULATIVE_STATEMENT,
  invoice: PRIORITY_INVOICE,
};

function orderedPayloadEntries(documentType, payload) {
  const keys = Object.keys(payload || {}).filter((k) => !SKIP_GENERIC_KEYS.has(k));
  const priority = PRIORITY_BY_DOCUMENT_TYPE[documentType];
  if (!priority) {
    return keys.sort().map((k) => [k, payload[k]]);
  }
  const rest = keys.filter((k) => !priority.includes(k));
  const ordered = [...priority.filter((k) => keys.includes(k)), ...rest.sort()];
  return ordered.map((k) => [k, payload[k]]);
}

/**
 * Универсальный PDF для student_documents (не common_act).
 */
async function buildGenericStudentDocumentPdf(typeLabel, documentType, payload, meta, resolveCtx = null) {
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType });
  const docNo = payload?.id != null ? String(payload.id) : String(meta.rowId);
  L.drawTextLine(`${typeLabel} № ${docNo}`, 14, { gapAfter: 8 });

  const headerFields = {
    'Тип документа': typeLabel,
    'ID записи в базе': meta.rowId,
    Подписан: payload?.signed ? 'Да' : 'Нет',
    'Дата создания': meta.createdAt != null ? String(meta.createdAt) : '—',
  };
  for (const [k, v] of Object.entries(headerFields)) {
    L.drawTextLine(`${k}: ${formatPayloadValue(v, 0, null, resolveCtx, documentType)}`, 10, { gapAfter: 6 });
  }
  L.bumpY(-6);

  L.drawTextLine('Данные документа', 12, { gapAfter: 8 });

  const skipInBody = new Set(['signed', 'id', 'createdAt']);
  for (const [key, val] of orderedPayloadEntries(documentType, payload)) {
    if (skipInBody.has(key)) continue;
    const label = payloadKeyLabel(key);
    L.drawLabeledBlock(`${label}:`, val, 10, 10, key);
  }

  L.finish();
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/** Таблица: синяя шапка, сетка, перенос текста в ячейках. */
function drawTable(layout, font, headers, rows, colWidths, baseRowH = 14) {
  const headerBg = rgb(0.49, 0.65, 0.94);
  const headerFg = rgb(1, 1, 1);
  const border = rgb(0.75, 0.75, 0.75);
  const n = headers.length;
  const headerSize = 8;

  function rowHeightFor(cells, sizes) {
    let maxLines = 1;
    for (let i = 0; i < n; i += 1) {
      const lines = wrapParagraph(font, normalizeText(cells[i] ?? '—'), colWidths[i] - 6, sizes[i]);
      maxLines = Math.max(maxLines, lines.length);
    }
    const lineH = sizes[0] + 2;
    return Math.max(baseRowH, maxLines * lineH + 6);
  }

  const headerH = rowHeightFor(headers, Array(n).fill(headerSize));
  layout.ensureSpace(headerH + 2);
  let x = MARGIN;
  const yHeader = layout.getY();
  const page = layout.getPage();
  for (let i = 0; i < n; i += 1) {
    const w = colWidths[i];
    page.drawRectangle({
      x,
      y: yHeader - headerH + 1,
      width: w,
      height: headerH,
      color: headerBg,
      borderColor: border,
      borderWidth: 0.5,
    });
    const lines = wrapParagraph(font, normalizeText(headers[i] ?? ''), w - 6, headerSize);
    let ty = yHeader - headerSize - 2;
    for (const line of lines) {
      page.drawText(line || ' ', { x: x + 3, y: ty, size: headerSize, font, color: headerFg });
      ty -= headerSize + 2;
    }
    x += w;
  }
  layout.setY(yHeader - headerH - 2);

  for (const row of rows) {
    const cells = row.length < n ? [...row, ...Array(n - row.length).fill('—')] : row.slice(0, n);
    const sizes = Array(n).fill(7);
    const h = rowHeightFor(cells, sizes);
    layout.ensureSpace(h + 2);
    x = MARGIN;
    const y0 = layout.getY();
    const pg = layout.getPage();
    for (let i = 0; i < n; i += 1) {
      const w = colWidths[i];
      pg.drawRectangle({
        x,
        y: y0 - h + 1,
        width: w,
        height: h,
        borderColor: border,
        borderWidth: 0.5,
      });
      const lines = wrapParagraph(font, normalizeText(cells[i] ?? '—'), w - 6, sizes[i]);
      let ty = y0 - sizes[i] - 2;
      for (const line of lines) {
        pg.drawText(line || ' ', { x: x + 3, y: ty, size: sizes[i], font, color: rgb(0, 0, 0) });
        ty -= sizes[i] + 2;
      }
      x += w;
    }
    layout.setY(y0 - h - 2);
  }
  layout.bumpY(-8);
}

/**
 * Акт общей формы (ГУ-23) — структурированный макет.
 */
async function buildCommonActPdf(payload, meta, resolveCtx = null) {
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'common_act' });
  const docNo = p.id != null ? String(p.id) : String(meta.rowId);

  L.drawTextLine('Акт общей формы (ГУ-23)', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 12 });

  L.drawTextLine('Реквизиты', 11, { gapAfter: 6 });
  L.drawParagraphBlock(
    [
      `Станция: ${R('id_station', p.id_station)}`,
      `Дата составления акта: ${p.act_date ? String(p.act_date) : '—'}`,
      `Начало/окончание простоя: ${formatDowntimeType(p.downtime_type)}`,
      `Подписан: ${p.signed ? 'Да' : 'Нет'}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${String(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    10
  );

  L.drawTextLine('При составлении акта присутствовали следующие лица', 11, { gapAfter: 6 });
  const persons = Array.isArray(p.persons) ? p.persons : [];
  if (!persons.length) {
    L.drawParagraphBlock('Нет данных.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№ п/п', 'Должность', 'ФИО'],
      persons.map((row, idx) => [
        String(idx + 1),
        row?.position != null ? String(row.position) : '—',
        row?.full_name != null ? String(row.full_name) : '—',
      ]),
      [40, 180, L.contentWidth - 220],
      16
    );
  }

  L.drawTextLine('Отправки, вагоны/контейнеры', 11, { gapAfter: 6 });
  const wagons = Array.isArray(p.wagons) ? p.wagons : [];
  if (!wagons.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      [
        '№',
        'Вагон/конт.',
        'Отправка',
        'Начало простоя',
        'Окончание',
        'Акт (нач.)',
        'Суток',
      ],
      wagons.map((w, idx) => [
        String(idx + 1),
        w?.vehicle_number != null ? String(w.vehicle_number) : '—',
        w?.shipment_label != null ? String(w.shipment_label) : '—',
        w?.downtime_start != null ? String(w.downtime_start) : '—',
        w?.downtime_end != null ? String(w.downtime_end) : '—',
        w?.prior_act_number != null ? String(w.prior_act_number) : '—',
        w?.downtime_days != null ? String(w.downtime_days) : '—',
      ]),
      [28, 72, 78, 95, 95, 88, 36],
      18
    );
  }

  L.drawTextLine('Описание обстоятельств, вызвавших составление акта', 11, { gapAfter: 4 });
  L.drawParagraphBlock(p.description != null ? String(p.description) : '—', 10);

  L.drawTextLine('Дополнение к описанию обстоятельств', 11, { gapAfter: 4 });
  L.drawParagraphBlock(p.supplement != null ? String(p.supplement) : '—', 10);

  L.drawTextLine('Специальные отметки', 11, { gapAfter: 6 });
  const marks = Array.isArray(p.special_marks) ? p.special_marks : [];
  if (!marks.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Тип', 'Отметка', 'Примечание'],
      marks.map((r, idx) => [
        String(idx + 1),
        r?.type != null ? String(r.type) : '—',
        r?.mark != null ? String(r.mark) : '—',
        r?.note != null ? String(r.note) : '—',
      ]),
      [32, 100, 160, L.contentWidth - 292],
      16
    );
  }

  L.drawTextLine('Прилагаемые и предъявляемые документы', 11, { gapAfter: 6 });
  const docs = Array.isArray(p.attached_documents) ? p.attached_documents : [];
  if (!docs.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Тип / вид', 'Наименование', 'Номер'],
      docs.map((r, idx) => [
        String(idx + 1),
        r?.type != null ? String(r.type) : '—',
        r?.document != null ? String(r.document) : '—',
        r?.number != null ? String(r.number) : '—',
      ]),
      [32, 100, L.contentWidth - 192, 60],
      16
    );
  }

  L.finish();
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Коммерческий акт (ГУ-22).
 */
async function buildCommercialActPdf(payload, meta, resolveCtx = null) {
  const c = (v) => cellDisplay(resolveCtx, null, v);
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'commercial_act' });
  const docNo = p.id != null ? String(p.id) : String(meta.rowId);

  L.drawTextLine('Коммерческий акт (ГУ-22)', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 10 });

  L.drawTextLine('Реквизиты и стороны', 11, { gapAfter: 6 });
  L.drawParagraphBlock(
    [
      `Номер поезда: ${c(p.train_number)}`,
      `Дата и время прибытия: ${c(p.arrival_date)} ${c(p.arrival_time)}`,
      `Вид отправки: ${R('id_speed_type', p.id_speed_type)}`,
      `Сопровождение: ${c(p.accompaniment)}`,
      `Номер накладной: ${c(p.invoice_number)}`,
      `Станция отправления / назначения: ${c(p.station_departure)} → ${c(p.station_destination)}`,
      `Грузоотправитель: ${c(p.shipper_name)} (ОКПО ${c(p.shipper_okpo)})`,
      `Грузополучатель: ${c(p.receiver_name)} (ОКПО ${c(p.receiver_okpo)})`,
      `Перевозчик: ${c(p.carrier_name)}`,
      `Заявленная ценность: ${c(p.declared_value)}`,
      `Груз погружен (ТС): ${c(p.cargo_loaded_means)}`,
      `Масса (отметка): ${c(p.mass_determined_label)}`,
      `Погружено кем / как: ${c(p.loaded_by_whom)} / ${c(p.loaded_how)}`,
      `Отметки о состоянии тары: ${c(p.sender_tare_marks)}`,
      `Подписан: ${c(p.signed)}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${c(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    9
  );

  L.drawTextLine('Вагоны', 11, { gapAfter: 6 });
  const wagons = Array.isArray(p.commercial_wagons) ? p.commercial_wagons : [];
  if (!wagons.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон', 'Род', 'Вмест.', 'Сост.', 'Тех.акт', 'Дата т.а.', 'Собств.'],
      wagons.map((w, idx) => [
        String(idx + 1),
        c(w.wagon_number),
        c(w.stock_type),
        c(w.capacity),
        c(w.condition),
        c(w.tech_act),
        c(w.tech_act_date),
        c(w.ownership),
      ]),
      [26, 72, 52, 44, 52, 58, 68, L.contentWidth - 372],
      16
    );
  }

  L.drawTextLine('Контейнеры', 11, { gapAfter: 6 });
  const cont = Array.isArray(p.commercial_containers) ? p.commercial_containers : [];
  if (!cont.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Номер', 'Размер', 'Собств.', 'Сост.', 'Тех.акт', 'Дата т.а.'],
      cont.map((w, idx) => [
        String(idx + 1),
        c(w.container_number),
        c(w.size_type),
        c(w.ownership),
        c(w.condition),
        c(w.tech_act),
        c(w.tech_act_date),
      ]),
      [26, 88, 72, 72, 58, 58, L.contentWidth - 374],
      16
    );
  }

  L.drawTextLine('ЗПУ', 11, { gapAfter: 6 });
  const zpu = Array.isArray(p.zpu_rows) ? p.zpu_rows : [];
  if (!zpu.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон/к-тр', 'Место', 'Собств.', 'Тип', 'Отметки', 'Аннул.', 'Повр.'],
      zpu.map((w, idx) => [
        String(idx + 1),
        c(w.vehicle_ref),
        c(w.place),
        c(w.ownership),
        c(w.type),
        c(w.control_marks),
        c(w.cancellation),
        c(w.damage_traces),
      ]),
      [22, 58, 52, 52, 48, 88, 40, L.contentWidth - 360],
      18
    );
  }

  L.drawTextLine('Груз по документам', 11, { gapAfter: 6 });
  const cbd = Array.isArray(p.cargo_by_docs) ? p.cargo_by_docs : [];
  if (!cbd.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон/к-тр', 'Марка', 'Мест', 'Упак.', 'Груз', 'Масса', 'На место'],
      cbd.map((w, idx) => [
        String(idx + 1),
        c(w.vehicle_ref),
        c(w.brand),
        c(w.places_count),
        c(w.package_type),
        c(w.cargo_name),
        c(w.total_mass_kg),
        c(w.mass_per_place),
      ]),
      [22, 56, 44, 36, 52, 92, 48, L.contentWidth - 350],
      18
    );
  }

  L.drawTextLine('Груз по факту (осмотр)', 11, { gapAfter: 6 });
  const cact = Array.isArray(p.cargo_actual) ? p.cargo_actual : [];
  if (!cact.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон/к-тр', 'Марка', 'Мест', 'Упак.', 'Груз', 'Масса', 'Поврежд.'],
      cact.map((w, idx) => [
        String(idx + 1),
        c(w.vehicle_ref),
        c(w.brand),
        c(w.places_count),
        c(w.package_type),
        c(w.cargo_name),
        c(w.total_mass_kg),
        c(w.damage_note),
      ]),
      [22, 56, 40, 34, 48, 88, 44, L.contentWidth - 332],
      18
    );
  }

  L.drawTextLine('Акт экспертизы и расхождения', 11, { gapAfter: 4 });
  L.drawParagraphBlock(
    [
      `Номер акта: ${c(p.expertise_act_number)}`,
      `Дата акта: ${c(p.expertise_act_date)}`,
      `Описание расхождений: ${c(p.cargo_discrepancy_description)}`,
      `Заключение: ${c(p.expertise_conclusion)}`,
    ].join('\n'),
    9
  );

  L.finish();
  return Buffer.from(await pdfDoc.save());
}

/**
 * Памятка приёмосдатчика.
 */
async function buildReminderPdf(payload, meta, resolveCtx = null) {
  const c = (v) => cellDisplay(resolveCtx, null, v);
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'reminder' });
  const docNo = p.id != null ? String(p.id) : String(meta.rowId);

  L.drawTextLine('Памятка приёмосдатчика', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 10 });

  L.drawParagraphBlock(
    [
      `Тип: ${c(p.reminder_type)}`,
      `Станция: ${R('id_station', p.id_station)}`,
      `Владелец пути: ${R('id_owner', p.id_owner)}`,
      `Место подачи: ${c(p.place_of_delivery)}`,
      `Локомотив: ${c(p.locomotive_by)}`,
      `Индекс поезда: ${c(p.train_index)}`,
      `Подписан: ${c(p.signed)}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${c(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    10
  );

  L.drawTextLine('Вагоны и операции', 11, { gapAfter: 6 });
  const lines = Array.isArray(p.wagon_lines) ? p.wagon_lines : [];
  if (!lines.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон', 'Опер.', 'Груз', 'Подача д', 'Подача вр', 'Уборка д', 'Уборка вр'],
      lines.map((w, idx) => [
        String(idx + 1),
        c(w.wagon_number),
        c(w.cargo_operation),
        c(w.cargo_name),
        c(w.delivery_date),
        c(w.delivery_time),
        c(w.removal_date),
        c(w.removal_time),
      ]),
      [24, 64, 52, 88, 52, 44, 52, L.contentWidth - 376],
      16
    );
  }

  const hist = Array.isArray(p.change_history) ? p.change_history : [];
  if (hist.length) {
    L.drawTextLine('История изменений', 11, { gapAfter: 6 });
    L.drawParagraphBlock(L.fmtPayload(hist), 9);
  }

  L.finish();
  return Buffer.from(await pdfDoc.save());
}

/**
 * Накопительная ведомость.
 */
async function buildCumulativeStatementPdf(payload, meta, resolveCtx = null) {
  const c = (v) => cellDisplay(resolveCtx, null, v);
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'cumulative_statement' });
  const docNo =
    p.document_number != null && String(p.document_number).trim() !== ''
      ? String(p.document_number)
      : p.id != null
        ? String(p.id)
        : String(meta.rowId);

  L.drawTextLine('Накопительная ведомость', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 10 });

  L.drawParagraphBlock(
    [
      `Период: ${c(p.period_from)} — ${c(p.period_to)}`,
      `Номер вручную: ${c(p.manual_number)}`,
      `Арбитражный суд: ${c(p.arbitration_court)}`,
      `Перевозчик: ${R('id_carrier_org', p.id_carrier_org)}`,
      `Место расчёта: ${c(p.place_of_calculation)}`,
      `Плательщик: ${R('id_payer', p.id_payer)}`,
      `Всего к оплате: ${c(p.total_to_pay)}`,
      `Руководитель: ${c(p.head_signer_name)}`,
      `Подписан: ${c(p.signed)}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${c(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    9
  );

  L.drawTextLine('Строки сборов', 11, { gapAfter: 6 });
  const rows = Array.isArray(p.fee_rows) ? p.fee_rows : [];
  if (!rows.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Дата', 'Тип док.', '№ док.', 'Статья', 'Вагон/к-тр', 'Сумма', 'С НДС', 'Прим.'],
      rows.map((r, idx) => [
        String(idx + 1),
        c(r.fee_date),
        R('source_document_type', r.source_document_type),
        c(r.source_document_number),
        R('fee_article_id', r.fee_article_id),
        c(r.wagon_or_container_number),
        c(r.amount_rub),
        c(r.calculated_amount),
        c(r.note),
      ]),
      [22, 54, 56, 52, 44, 68, 48, 48, L.contentWidth - 392],
      20
    );
  }

  L.finish();
  return Buffer.from(await pdfDoc.save());
}

/**
 * Ведомость подачи и уборки.
 */
async function buildFillingStatementPdf(payload, meta, resolveCtx = null) {
  const c = (v) => cellDisplay(resolveCtx, null, v);
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'filling_statement' });
  const docNo =
    p.statement_number != null && String(p.statement_number).trim() !== ''
      ? String(p.statement_number)
      : p.id != null
        ? String(p.id)
        : String(meta.rowId);

  L.drawTextLine('Ведомость подачи и уборки', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 10 });

  L.drawTextLine('Шапка и период', 11, { gapAfter: 6 });
  L.drawParagraphBlock(
    [
      `Станция: ${R('id_station', p.id_station)}`,
      `Договор: ${R('id_contract', p.id_contract)}`,
      `Владелец п/п: ${R('id_owner', p.id_owner)}`,
      `Место расчёта / передачи: ${c(p.place_of_calculation)} / ${c(p.place_of_transfer)}`,
      `Плательщик: ${R('id_payer', p.id_payer)}`,
      `Итоговая сумма: ${c(p.total_sum)}`,
      `Форма 2 №: ${c(p.form2_number)}`,
      `Тарифный план / перегон: ${R('tariff_plan_id', p.tariff_plan_id)} / ${R('track_branch_id', p.track_branch_id)}`,
      `Нумерация ведомости: ${R('statement_numbering_type', p.statement_numbering_type)}`,
      `Дата шапки: ${c(p.statement_heading_date)}`,
      `Период: ${c(p.period_from)} — ${c(p.period_to)}`,
      `Неплачиваемое время: ${c(p.unpaid_time)}`,
      `Оборот вагона / парный: ${c(p.wagon_cycle_time)} / ${c(p.wagon_cycle_paired)}`,
      `Длина пути, м: ${c(p.expanded_track_length_m)}`,
      `Сутки пользования ПП: ${c(p.pp_usage_days)}`,
      `Подписан: ${c(p.signed)}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${c(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    8
  );

  L.drawTextLine('Памятки на уборку', 11, { gapAfter: 6 });
  const cr = Array.isArray(p.cleaning_reminders) ? p.cleaning_reminders : [];
  if (!cr.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Памятка', 'Дата', 'Оборот', 'Уборка', 'Ман.мин', 'Ман.сб.', 'Лок.сб.', 'Сост.'],
      cr.map((r, idx) => [
        String(idx + 1),
        c(r.reminder_number),
        c(r.reminder_date),
        c(r.wagon_turnover),
        c(r.cleanup_time),
        c(r.extra_maneuver_min),
        c(r.maneuver_fee),
        c(r.locomotive_fee),
        c(r.state),
      ]),
      [22, 64, 48, 44, 44, 40, 40, 40, L.contentWidth - 342],
      18
    );
  }

  L.drawTextLine('Вагоны по памяткам', 11, { gapAfter: 6 });
  const wr = Array.isArray(p.wagons_by_reminders) ? p.wagons_by_reminders : [];
  if (!wr.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Вагон', 'Пам.под.', 'Пам.уб.', 'Опер.', 'Подача', 'Оконч.', 'Оплата', 'Итого', 'Прим.'],
      wr.map((r, idx) => [
        String(idx + 1),
        c(r.wagon_number),
        c(r.reminder_delivery_number),
        c(r.reminder_cleaning_number),
        c(r.operation_code),
        c(r.delivery_dt),
        c(r.operation_end_dt),
        c(r.payment_amount),
        c(r.row_total),
        c(r.note),
      ]),
      [20, 52, 48, 48, 36, 72, 72, 44, 44, L.contentWidth - 446],
      20
    );
  }

  L.drawTextLine('Сборы (подача / уборка)', 11, { gapAfter: 6 });
  const fr = Array.isArray(p.fee_delivery_rows) ? p.fee_delivery_rows : [];
  if (!fr.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Памятка', 'Опер.', 'Дата', 'Время', 'Ваг.', 'Ставка', 'Сумма', 'Место', 'Прим.'],
      fr.map((r, idx) => [
        String(idx + 1),
        c(r.reminder_number),
        R('operation', r.operation),
        c(r.op_date),
        c(r.op_time),
        c(r.wagon_count),
        c(r.rate),
        c(r.sum),
        c(r.delivery_place),
        c(r.note),
      ]),
      [20, 56, 44, 44, 36, 28, 40, 44, 52, L.contentWidth - 364],
      20
    );
  }

  L.drawTextLine('Итоги подачи и пользования ПП', 11, { gapAfter: 4 });
  L.drawParagraphBlock(L.fmtPayload(p.delivery_summary), 8);
  L.drawParagraphBlock(L.fmtPayload(p.pp_usage_summary), 8);

  L.drawTextLine('Штрафы и пени (блок)', 11, { gapAfter: 4 });
  L.drawParagraphBlock(L.fmtPayload(p.fine), 8);

  const hist = Array.isArray(p.change_history) ? p.change_history : [];
  if (hist.length) {
    L.drawTextLine('История изменений', 11, { gapAfter: 4 });
    L.drawParagraphBlock(L.fmtPayload(hist), 8);
  }

  L.finish();
  return Buffer.from(await pdfDoc.save());
}

/**
 * Накладная (форма ГУ-1 и др.) — табличные блоки по структуре формы.
 */
async function buildInvoicePdf(payload, meta, resolveCtx = null) {
  const c = (v) => cellDisplay(resolveCtx, null, v);
  const R = (k, v) => cellDisplay(resolveCtx, k, v);
  const p = payload || {};
  const pdfDoc = await PDFDocument.create();
  const font = await embedCyrillicFont(pdfDoc);
  const L = createLayout(pdfDoc, font, { resolveCtx, documentType: 'invoice' });
  const docNo = p.id != null ? String(p.id) : String(meta.rowId);

  L.drawTextLine('Накладная', 14, { gapAfter: 4 });
  L.drawTextLine(`№ ${docNo}`, 12, { gapAfter: 10 });

  L.drawTextLine('Реквизиты', 11, { gapAfter: 6 });
  L.drawParagraphBlock(
    [
      `Тип накладной: ${c(p.invoice_type)}`,
      `Тип бланка: ${R('id_blank_type', p.id_blank_type)}`,
      `Ввод по назначению: ${c(p.input_by_destination)}`,
      `Вид отправки: ${R('id_send_type', p.id_send_type)}`,
      `Грузоотправитель: ${R('id_shipper', p.id_shipper)}`,
      `Адрес грузоотправителя: ${c(p.shipper_addr)}`,
      `Станция отправл./назн.: ${R('id_station_departure', p.id_station_departure)} / ${R('id_station_destination', p.id_station_destination)}`,
      `Ж/д путь: ${c(p.departure_railway_path)} → ${c(p.destination_railway_path)}`,
      `Скорость отправления: ${R('id_speed_type', p.id_speed_type)}`,
      `Место оплаты (страна): ${R('id_place_of_payment', p.id_place_of_payment)}`,
      `Заявка на перевозку: ${R('id_request_transportation', p.id_request_transportation)}`,
      `График подачи: ${R('id_submission_schedule', p.id_submission_schedule)}`,
      `Вид грузовой работы: ${c(p.cargo_work_type)}`,
      `Страна отпр./назн.: ${R('id_country_departure', p.id_country_departure)} / ${R('id_country_destination', p.id_country_destination)}`,
      `Форма оплаты: ${c(p.payment_form)}`,
      `Вместимость контейнера, т: ${c(p.container_capacity_tons)}`,
      `Грузополучатель: ${R('id_receiver', p.id_receiver)}`,
      `Адрес грузополучателя: ${c(p.receiver_addr)}`,
      `Род ПС / собственность: ${R('id_rolling_stock_type', p.id_rolling_stock_type)} / ${R('id_ownership', p.id_ownership)}`,
      `Время погрузки МСК / местн.: ${c(p.loading_time_msk)} / ${c(p.loading_time_local)}`,
      `Способ определения массы: ${c(p.mass_determination_method)}`,
      `Крепление груза: ${c(p.cargo_secured_according_to)}`,
      `Тех. условия: ${c(p.technical_conditions)}`,
      `Погрузка завершена: ${c(p.loading_finished)}`,
      `Подписан: ${c(p.signed)}`,
      `ID записи в базе: ${meta.rowId}`,
      meta.createdAt ? `Дата создания записи: ${c(meta.createdAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    8
  );

  L.drawTextLine('Грузовые позиции', 11, { gapAfter: 6 });
  const goods = Array.isArray(p.goods) ? p.goods : [];
  if (!goods.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Груз (ID)', 'Упак.', 'Места', 'Пак.', 'Масса кг', 'ГНГ', 'Код', 'Опасн.'],
      goods.map((r, idx) => [
        String(idx + 1),
        R('id_cargo', r.id_cargo),
        c(r.package),
        c(r.places),
        c(r.packages),
        c(r.planned_weight_kg),
        c(r.gng_name),
        c(r.gng_code),
        c(r.danger),
      ]),
      [22, 44, 40, 36, 36, 48, 100, 44, L.contentWidth - 370],
      18
    );
  }

  L.drawTextLine('Маршрут следования', 11, { gapAfter: 6 });
  const route = Array.isArray(p.route_rows) ? p.route_rows : [];
  if (!route.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Страна (ID)', 'Станция (ID)', 'Расст.', 'Код плательщика'],
      route.map((r, idx) => [
        String(idx + 1),
        R('id_country', r.id_country),
        R('id_station', r.id_station),
        c(r.distance),
        c(r.payer_code),
      ]),
      [24, 56, 56, 52, L.contentWidth - 188],
      14
    );
  }

  L.drawTextLine('Специальные отметки', 11, { gapAfter: 6 });
  const sm = Array.isArray(p.special_marks) ? p.special_marks : [];
  if (!sm.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Тип', 'Отметка', 'Примечание'],
      sm.map((r, idx) => [String(idx + 1), c(r.type), c(r.mark), c(r.note)]),
      [28, 88, 140, L.contentWidth - 256],
      14
    );
  }

  L.drawTextLine('Прилагаемые документы', 11, { gapAfter: 6 });
  const ad = Array.isArray(p.attached_documents) ? p.attached_documents : [];
  if (!ad.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Тип', 'Наименование', 'Номер'],
      ad.map((r, idx) => [String(idx + 1), c(r.type), c(r.document), c(r.number)]),
      [28, 80, L.contentWidth - 188, 80],
      14
    );
  }

  L.drawTextLine('Контейнеры', 11, { gapAfter: 6 });
  const cont = Array.isArray(p.containers) ? p.containers : [];
  if (!cont.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Номер', 'Собств.(ID)', 'Влад.(ID)', 'Вмест.,т', 'Нетто', 'Брутто', 'ЗПУ'],
      cont.map((r, idx) => [
        String(idx + 1),
        c(r.number),
        R('id_ownership', r.id_ownership),
        R('id_owner', r.id_owner),
        c(r.capacity_tons),
        c(r.net_kg),
        c(r.gross_kg),
        c(r.zpu_count),
      ]),
      [22, 72, 44, 44, 44, 44, 44, 36],
      14
    );
  }

  L.drawTextLine('Вагоны', 11, { gapAfter: 6 });
  const wag = Array.isArray(p.wagons) ? p.wagons : [];
  if (!wag.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Номер', 'Род ПС (ID)', 'Вмест.,т', 'Нетто', 'Брутто', 'ЗПУ'],
      wag.map((r, idx) => [
        String(idx + 1),
        c(r.number),
        R('id_rolling_stock_type', r.id_rolling_stock_type),
        c(r.capacity_tons),
        c(r.net_kg),
        c(r.gross_kg),
        c(r.zpu_count),
      ]),
      [24, 80, 52, 44, 44, 44, L.contentWidth - 332],
      14
    );
  }

  L.drawTextLine('Проводники', 11, { gapAfter: 6 });
  const cond = Array.isArray(p.conductors) ? p.conductors : [];
  if (!cond.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'ФИО', 'Серия пасп.', '№ пасп.', 'Командировка'],
      cond.map((r, idx) => [
        String(idx + 1),
        c(r.fio),
        c(r.passport_series),
        c(r.passport_number),
        c(r.mission_id),
      ]),
      [24, 160, 52, 64, L.contentWidth - 300],
      14
    );
  }

  L.drawTextLine('Отметки по вагонам', 11, { gapAfter: 6 });
  const wm = Array.isArray(p.wagon_marks) ? p.wagon_marks : [];
  if (!wm.length) {
    L.drawParagraphBlock('Нет строк.', 9);
  } else {
    drawTable(
      L,
      font,
      ['№', 'Тип', 'Отметка', 'Примечание'],
      wm.map((r, idx) => [String(idx + 1), c(r.type), c(r.mark), c(r.note)]),
      [28, 88, 140, L.contentWidth - 256],
      14
    );
  }

  L.finish();
  return Buffer.from(await pdfDoc.save());
}

async function buildStudentDocumentPdf(documentType, typeLabel, payload, meta, options = {}) {
  const dictionaryMaps = options.dictionaryMaps ?? null;
  const resolveCtx = dictionaryMaps ? createPdfResolveContext(dictionaryMaps, documentType) : null;
  switch (documentType) {
    case 'common_act':
      return buildCommonActPdf(payload, meta, resolveCtx);
    case 'commercial_act':
      return buildCommercialActPdf(payload, meta, resolveCtx);
    case 'reminder':
      return buildReminderPdf(payload, meta, resolveCtx);
    case 'filling_statement':
      return buildFillingStatementPdf(payload, meta, resolveCtx);
    case 'cumulative_statement':
      return buildCumulativeStatementPdf(payload, meta, resolveCtx);
    case 'invoice':
      return buildInvoicePdf(payload, meta, resolveCtx);
    default:
      return buildGenericStudentDocumentPdf(typeLabel, documentType, payload, meta, resolveCtx);
  }
}

module.exports = {
  buildSimpleFieldsPdf,
  buildStudentDocumentPdf,
  buildCommonActPdf,
  buildCommercialActPdf,
  buildReminderPdf,
  buildFillingStatementPdf,
  buildCumulativeStatementPdf,
  buildInvoicePdf,
  embedCyrillicFont,
  formatPayloadValue,
};
