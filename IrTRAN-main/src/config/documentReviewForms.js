export const REVIEW_DOCUMENT_TYPE_OPTIONS = [
  { value: "transportation_request", label: "Заявка на грузоперевозку" },
  { value: "invoice", label: "Накладная" },
  { value: "common_act", label: "Акт общей формы (ГУ-23)" },
  { value: "commercial_act", label: "Коммерческий акт (ГУ-22)" },
  { value: "reminder", label: "Памятка приемосдатчика" },
  { value: "filling_statement", label: "Ведомость подачи и уборки" },
  { value: "cumulative_statement", label: "Накопительная ведомость" },
];

export const REVIEW_DOCUMENT_TYPE_LABELS = Object.fromEntries(
  REVIEW_DOCUMENT_TYPE_OPTIONS.map((x) => [x.value, x.label])
);

function baseTemplate() {
  return {
    id: null,
    signed: false,
  };
}

export const REVIEW_TEMPLATE_DEFAULTS = {
  transportation_request: {
    ...baseTemplate(),
    registration_date: "",
    transportation_date_from: "",
    transportation_date_to: "",
    id_station_departure: null,
    id_shipper: null,
    id_cargo_group: null,
    id_method_submission: null,
    Sendings: [],
    SubmissionSchedules: [],
    Payers: [],
  },
  invoice: {
    ...baseTemplate(),
    invoice_type: "",
    id_send_type: null,
    id_shipper: null,
    id_station_departure: null,
    id_station_destination: null,
    id_country_departure: null,
    id_country_destination: null,
    id_receiver: null,
    goods: [],
    route_rows: [],
    special_marks: [],
    attached_documents: [],
    containers: [],
    wagons: [],
  },
  common_act: {
    ...baseTemplate(),
    id_station: null,
    act_date: "",
    downtime_type: "",
    description: "",
    supplement: "",
    persons: [],
    wagons: [],
    special_marks: [],
    attached_documents: [],
  },
  commercial_act: {
    ...baseTemplate(),
    train_number: "",
    arrival_date: "",
    arrival_time: "",
    id_station: null,
    id_speed_type: null,
    wagons: [],
    containers: [],
    zpu_rows: [],
    cargo_docs: [],
    cargo_actual_rows: [],
  },
  reminder: {
    ...baseTemplate(),
    reminder_type: "",
    id_station: null,
    id_owner: null,
    locomotive_by: "",
    train_index: "",
    wagon_lines: [],
  },
  filling_statement: {
    ...baseTemplate(),
    id_station: null,
    id_contract: null,
    id_owner: null,
    id_payer: null,
    period_from: "",
    period_to: "",
    cleaning_reminders: [],
    wagons_by_reminders: [],
    fee_delivery_rows: [],
  },
  cumulative_statement: {
    ...baseTemplate(),
    id_carrier_org: null,
    id_payer: null,
    period_from: "",
    period_to: "",
    fee_rows: [],
  },
};

export const REVIEW_TEMPLATE_FORM_SCHEMAS = {
  transportation_request: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "registration_date", label: "Дата регистрации", type: "date" },
          { key: "transportation_date_from", label: "Период перевозок с", type: "date" },
          { key: "transportation_date_to", label: "Период перевозок по", type: "date" },
          { key: "id_message_type", label: "Вид сообщения", type: "number" },
          { key: "id_sign_sending", label: "Признак отправки", type: "number" },
          { key: "id_country_departure", label: "Страна отправления", type: "number" },
          { key: "id_station_departure", label: "Станция отправления", type: "number" },
          { key: "id_shipper", label: "Грузоотправитель", type: "number" },
          { key: "id_carriage_ownership", label: "Принадлежность вагонов/контейнеров", type: "number" },
          { key: "id_cargo_group", label: "Группа груза", type: "number" },
          { key: "id_method_submission", label: "Способ подачи", type: "number" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Отправки",
        arrays: [
          {
            key: "Sendings",
            label: "Отправки",
            itemType: "number",
            indexLabel: "№",
            valueHeader: "Отправка",
          },
        ],
      },
      {
        title: "График подач",
        arrays: [
          {
            key: "SubmissionSchedules",
            label: "График подач",
            itemType: "number",
            indexLabel: "№",
            valueHeader: "График подачи",
          },
        ],
      },
      {
        title: "Плательщики/Экспедиторы",
        arrays: [
          {
            key: "Payers",
            label: "Плательщики/Экспедиторы",
            itemType: "number",
            indexLabel: "№",
            valueHeader: "Плательщик/Экспедитор",
          },
        ],
      },
    ],
  },
  invoice: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "invoice_type", label: "Тип накладной", type: "text" },
          { key: "id_send_type", label: "Вид отправки", type: "number" },
          { key: "id_shipper", label: "Грузоотправитель", type: "number" },
          { key: "id_station_departure", label: "Станция отправления", type: "number" },
          { key: "id_station_destination", label: "Станция назначения", type: "number" },
          { key: "id_country_departure", label: "Страна отправления", type: "number" },
          { key: "id_country_destination", label: "Страна назначения", type: "number" },
          { key: "id_receiver", label: "Грузополучатель", type: "number" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Грузы",
        arrays: [
          {
            key: "goods",
            label: "Грузы",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "id_cargo", label: "Код груза", header: "Код груза", type: "number", width: "90px" },
              { key: "gng_name", label: "Груз", header: "Груз", type: "text", width: "180px" },
              { key: "package", label: "Упаковка", type: "text" },
              { key: "places", label: "Кол-во мест", type: "number" },
              { key: "packages", label: "Кол-во пакетов", type: "number" },
              { key: "planned_weight_kg", label: "План. масса груза (кг)", header: "План. масса\nгруза (кг)", type: "number" },
              { key: "gng_code", label: "Код груза ГНГ", header: "Код груза\nГНГ", type: "text" },
              { key: "danger", label: "Признак опасности", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Маршрут следования",
        arrays: [
          {
            key: "route_rows",
            label: "Маршрут следования",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "id_country", label: "Страна инфраструктуры", type: "number" },
              { key: "id_station", label: "Тарифная станция", type: "number", header: "Тарифная\nстанция" },
              { key: "railway", label: "Дорога", type: "text" },
              { key: "station_code", label: "Код станции", type: "text" },
              { key: "port", label: "Порт", type: "text" },
              { key: "private_track", label: "Подъездной путь", header: "Подъездной\nпуть", type: "text" },
              { key: "distance", label: "Кратчайшее расстояние", header: "Кратчайшее\nрасстояние", type: "number" },
              { key: "payer", label: "Плательщик", type: "text" },
              { key: "payer_code", label: "Код плательщика", header: "Код\nплательщика", type: "text" },
              { key: "expeditor_code", label: "Подкод экспедитора", type: "text" },
              { key: "transport_type", label: "Вид транспорта", type: "text" },
              { key: "track_code", label: "Код колеи", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Специальные отметки",
        arrays: [
          {
            key: "special_marks",
            label: "Специальные отметки",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "type", label: "Тип", type: "text" },
              { key: "mark", label: "Отметка", type: "text" },
              { key: "note", label: "Примечание", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Прилагаемые и предъявляемые документы",
        arrays: [
          {
            key: "attached_documents",
            label: "Прилагаемые и предъявляемые документы",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "type", label: "Тип / вид", type: "text" },
              { key: "document", label: "Наименование документа", type: "text" },
              { key: "number", label: "Номер", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Контейнеры",
        arrays: [
          {
            key: "containers",
            label: "Контейнеры",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "number", label: "Номер контейнера", type: "text" },
              { key: "container_type", label: "Типоразмер", type: "text" },
              { key: "ownership", label: "Принадлежность", type: "text" },
              { key: "state", label: "Состояние", type: "text" },
              { key: "technical_act", label: "Технический акт", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Вагоны",
        arrays: [
          {
            key: "wagons",
            label: "Вагоны",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "number", label: "Номер вагона", type: "text" },
              { key: "wagon_type", label: "Род вагона", type: "text" },
              { key: "capacity", label: "Грузоподъемность", type: "text" },
              { key: "state", label: "Состояние", type: "text" },
              { key: "technical_act", label: "Технический акт", type: "text" },
              { key: "ownership", label: "Принадлежность", type: "text" },
            ],
          },
        ],
      },
    ],
  },
  common_act: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "act_date", label: "Дата акта", type: "date" },
          { key: "id_station", label: "Станция составления", type: "number" },
          { key: "downtime_type", label: "Тип простоя", type: "text" },
          { key: "description", label: "Описание", type: "text" },
          { key: "supplement", label: "Дополнение", type: "text" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Табличные секции",
        arrays: [
          {
            key: "persons",
            label: "Лица",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "position", label: "Должность", type: "text" },
              { key: "full_name", label: "ФИО", type: "text" },
            ],
          },
          {
            key: "wagons",
            label: "Отправки, вагоны/контейнеры",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "vehicle_number", label: "Номер вагона/контейнера", header: "Номер\nвагона/контейнера", type: "text" },
              { key: "shipment_label", label: "Номер отправки", type: "text" },
              { key: "downtime_start", label: "Дата и время начала простоя", header: "Дата и время\nначала простоя", type: "text" },
              { key: "prior_act_number", label: "Номер акта на начало простоя", header: "Номер акта\nна начало простоя", type: "text" },
              { key: "downtime_days", label: "Кол-во суток простоя", type: "number" },
            ],
          },
          {
            key: "special_marks",
            label: "Специальные отметки",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "type", label: "Тип", type: "text" },
              { key: "mark", label: "Отметка", type: "text" },
              { key: "note", label: "Примечание", type: "text" },
            ],
          },
          {
            key: "attached_documents",
            label: "Прилагаемые и предъявляемые документы",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "type", label: "Тип / вид", type: "text" },
              { key: "document", label: "Наименование документа", type: "text" },
              { key: "number", label: "Номер", type: "text" },
            ],
          },
        ],
      },
    ],
  },
  commercial_act: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "train_number", label: "Поезд №", type: "text" },
          { key: "arrival_date", label: "Дата прибытия", type: "date" },
          { key: "arrival_time", label: "Время прибытия", type: "text" },
          { key: "id_station", label: "Станция", type: "number" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Вагоны",
        arrays: [
          {
            key: "wagons",
            label: "Вагоны",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "vehicle_number", label: "Номер вагона", type: "text" },
              { key: "wagon_type", label: "Род вагона", type: "text" },
              { key: "capacity", label: "Грузоподъемность", type: "text" },
              { key: "state", label: "Состояние", type: "text" },
              { key: "technical_act", label: "Технический акт", type: "text" },
              { key: "ownership", label: "Принадлежность", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Контейнеры",
        arrays: [
          {
            key: "containers",
            label: "Контейнеры",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "number", label: "Номер контейнера", type: "text" },
              { key: "container_type", label: "Типоразмер", type: "text" },
              { key: "ownership", label: "Принадлежность", type: "text" },
              { key: "state", label: "Состояние", type: "text" },
              { key: "technical_act", label: "Технический акт", type: "text" },
            ],
          },
        ],
      },
      {
        title: "ЗПУ",
        arrays: [
          {
            key: "zpu_rows",
            label: "ЗПУ",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "vehicle_ref", label: "№ вагона, контейнера", type: "text" },
              { key: "place", label: "Место наложения ЗПУ", type: "text" },
              { key: "ownership", label: "Принадлежность ЗПУ", type: "text" },
              { key: "zpu_type", label: "Тип ЗПУ", type: "text" },
              { key: "signs", label: "Контрольные знаки", type: "text" },
              { key: "redemption", label: "Погашение", type: "text" },
              { key: "damage_marks", label: "Следы вскрытия или повреждения", type: "text" },
            ],
          },
        ],
      },
    ],
  },
  reminder: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "reminder_type", label: "Тип памятки", type: "text" },
          { key: "id_station", label: "Станция", type: "number" },
          { key: "id_owner", label: "Владелец пути", type: "number" },
          { key: "locomotive_by", label: "Локомотив", type: "text" },
          { key: "train_index", label: "Индекс поезда", type: "text" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Табличная часть",
        arrays: [
          {
            key: "wagon_lines",
            label: "Вагоны/контейнеры",
            itemType: "object",
            indexLabel: "№ п/п",
            fields: [
              { key: "wagon_number", label: "№ вагона", header: "№ вагона", type: "text", width: "95px" },
              { key: "railway_admin", label: "Код ж.д. адм.", header: "Код\nж.д.\nадм.", type: "text", width: "70px" },
              { key: "wagon_ownership", label: "Принадлежность вагона", header: "Принадл.\nвагона", type: "text", width: "80px" },
              { key: "cargo_name", label: "Наименование груза", type: "text" },
              { key: "cargo_operation", label: "Подача/передача", header: "Подача/\nпередача", type: "text", width: "90px" },
              { key: "op_delivery", label: "Подача", type: "text" },
              { key: "op_notify", label: "Уведом.", header: "Уведом.", type: "text", width: "85px" },
              { key: "op_removal", label: "Уборка", type: "text" },
              { key: "delay_hm", label: "Время задержки", header: "Время\nзадержки", type: "text", width: "90px" },
              { key: "gu23_act", label: "№ акта ГУ-23", header: "№ акта\nГУ-23", type: "text", width: "85px" },
            ],
          },
        ],
      },
    ],
  },
  filling_statement: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "id_station", label: "Станция", type: "number" },
          { key: "id_contract", label: "Договор", type: "number" },
          { key: "id_owner", label: "Владелец пути", type: "number" },
          { key: "id_payer", label: "Плательщик", type: "number" },
          { key: "period_from", label: "Период с", type: "date" },
          { key: "period_to", label: "Период по", type: "date" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Памятки уборки",
        arrays: [
          {
            key: "cleaning_reminders",
            label: "Памятки уборки",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "reminder_number", label: "Номер памятки", type: "text" },
              { key: "reminder_date", label: "Дата памятки", type: "date" },
              { key: "wagon_turnover", label: "Вагонооборот", type: "text" },
              { key: "cleanup_time", label: "Время уборки", type: "text" },
              { key: "extra_maneuver_min", label: "Время дополн. маневр. работы", header: "Время дополн.\nманевр. работы", type: "text" },
              { key: "maneuver_fee", label: "Сбор за маневровую работу", header: "Сбор за\nманевровую\nработу", type: "number" },
              { key: "locomotive_fee", label: "Сбор за пробег локомотива", header: "Сбор за пробег\nлокомотива", type: "number" },
              { key: "state", label: "Состояние памятки уборки", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Вагоны по памяткам",
        arrays: [
          {
            key: "wagons_by_reminders",
            label: "Вагоны по памяткам",
            itemType: "object",
            indexLabel: "№ п/п",
            fields: [
              { key: "wagon_number", label: "Номер вагона", type: "text" },
              { key: "reminder_delivery_number", label: "Номер памятки подачи", type: "text" },
              { key: "reminder_cleaning_number", label: "Номер памятки уборки", type: "text" },
              { key: "id_ownership", label: "Принадл. вагона", type: "text" },
              { key: "id_rolling_type", label: "Код группы вагона", type: "text" },
              { key: "operation_code", label: "Операция", type: "text" },
              { key: "delivery_dt", label: "Время подачи", type: "text" },
              { key: "operation_end_dt", label: "Время завершения операции", type: "text" },
              { key: "time_total_h", label: "Общее время", type: "text" },
              { key: "norm_hours_display", label: "Расчетное время (час)", header: "Расчетное\nвремя (час)", type: "text" },
              { key: "time_calc_payment_h", label: "Время для расчета платы", header: "Время для\nрасчета платы", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Начисления",
        arrays: [
          {
            key: "fee_delivery_rows",
            label: "Начисления",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "reminder_number", label: "Номер памятки", type: "text" },
              { key: "operation", label: "Операция", type: "text" },
              { key: "op_date", label: "Дата", type: "date" },
              { key: "op_time", label: "Время", type: "text" },
              { key: "wagon_count", label: "Кол-во вагонов", type: "number" },
              { key: "sum", label: "Сумма", type: "number" },
            ],
          },
        ],
      },
    ],
  },
  cumulative_statement: {
    sections: [
      {
        title: "Документ",
        fields: [
          { key: "document_number", label: "Номер документа", type: "text" },
          { key: "id_carrier_org", label: "Перевозчик", type: "number" },
          { key: "id_payer", label: "Плательщик", type: "number" },
          { key: "period_from", label: "Период с", type: "date" },
          { key: "period_to", label: "Период по", type: "date" },
          { key: "total_to_pay", label: "Итого к оплате", type: "number" },
          { key: "signed", label: "Подписан", type: "boolean" },
        ],
      },
      {
        title: "Сборы",
        arrays: [
          {
            key: "fee_rows",
            label: "Сборы",
            itemType: "object",
            indexLabel: "",
            fields: [
              { key: "fee_date", label: "Дата", type: "date" },
              { key: "source_document_type", label: "Наименование документа", type: "text" },
              { key: "source_document_number", label: "Номер документа", type: "text" },
              { key: "source_document_state", label: "Состояние родительского документа", header: "Состояние\nродительского документа", type: "text" },
              { key: "fee_article_id", label: "Код статьи сбора", type: "text" },
              { key: "fee_article_name", label: "Наименование сбора", type: "text" },
              { key: "note", label: "Примечание", type: "text" },
              { key: "wagon_or_container_number", label: "Номер ваг/конт", type: "text" },
              { key: "amount_rub", label: "Сумма, руб.", type: "number" },
              { key: "amount_kzt", label: "Сумма, тенге", type: "number" },
              { key: "nds_option_id", label: "Признак НДС", type: "text" },
              { key: "nds_amount", label: "Сумма НДС", type: "number" },
              { key: "nds_rate", label: "Ставка НДС", type: "number" },
            ],
          },
        ],
      },
    ],
  },
};

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function mergeTemplateDefaults(type, payload) {
  const base = deepClone(REVIEW_TEMPLATE_DEFAULTS[type] || {});
  if (!payload || typeof payload !== "object") return base;
  return { ...base, ...deepClone(payload) };
}

