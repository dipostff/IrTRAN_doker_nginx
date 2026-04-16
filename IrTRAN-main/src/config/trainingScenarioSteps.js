/**
 * Учебный сценарий по типам документов: шаги и функции проверки заполнения (по текущему объекту документа).
 * `check(doc)` — чистая функция, doc — снимок из ref.
 */
export const TRAINING_SCENARIOS = {
  transportation: {
    title: "Заявка на грузоперевозку",
    hints: {
      primary:
        "Заполните вкладку «Документ», затем добавьте отправки на вкладке «Учётная карточка». Обязательные поля отмечены звёздочкой (*).",
      extra: "Проверьте согласованность станций, грузов и сроков перевозки перед сохранением.",
    },
    steps: [
      {
        id: "t1",
        tab: "document",
        label: "Шапка: даты регистрации и периода перевозок, вид сообщения и признак отправки",
        check: (d) =>
          !!d?.registration_date &&
          !!d?.transportation_date_from &&
          !!d?.transportation_date_to &&
          !!d?.id_message_type &&
          !!d?.id_sign_sending,
      },
      {
        id: "t2",
        tab: "document",
        label: "Маршрут: страна и станция отправления",
        check: (d) => !!d?.id_country_departure && !!d?.id_station_departure,
      },
      {
        id: "t3",
        tab: "document",
        label: "Участники: грузоотправитель и связанные реквизиты",
        check: (d) => !!d?.id_shipper,
      },
      {
        id: "t4",
        tab: "sending",
        label: "Учётная карточка: добавлена хотя бы одна отправка",
        check: (d) => Array.isArray(d?.Sendings) && d.Sendings.length > 0,
      },
      {
        id: "t5",
        tab: "document",
        label: "Документ сохранён в системе",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  invoice: {
    title: "Накладная",
    hints: {
      primary:
        "Выберите тип накладной и бланк, затем заполните станции, контрагентов и реквизиты отправления/назначения.",
      extra: "Проверьте соответствие скорости вагона, вида отправки и получателя.",
    },
    steps: [
      {
        id: "i1",
        tab: "document",
        label: "Тип накладной и тип бланка",
        check: (d) => !!d?.invoice_type && d?.id_blank_type != null,
      },
      {
        id: "i2",
        tab: "document",
        label: "Станции отправления и назначения",
        check: (d) => !!d?.id_station_departure && !!d?.id_station_destination,
      },
      {
        id: "i3",
        tab: "document",
        label: "Грузоотправитель и получатель",
        check: (d) => !!d?.id_shipper && !!d?.id_receiver,
      },
      {
        id: "i4",
        tab: "document",
        label: "Вид отправки и скорость",
        check: (d) => d?.id_send_type != null && d?.id_speed_type != null,
      },
      {
        id: "i5",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  reminder: {
    title: "Памятка приёмосдатчика",
    hints: {
      primary: "Выберите тип памятки (подача/уборка), станцию и при необходимости владельца пути.",
      extra: "Укажите место сдачи вагонов и поездной индекс, если требуется по сценарию.",
    },
    steps: [
      {
        id: "r1",
        tab: "document",
        label: "Тип памятки",
        check: (d) => !!d?.reminder_type,
      },
      {
        id: "r2",
        tab: "document",
        label: "Станция (и при необходимости владелец пути)",
        check: (d) => !!d?.id_station,
      },
      {
        id: "r3",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  common_act: {
    title: "Акт общей формы",
    hints: {
      primary: "Укажите станцию, дату акта, опишите простой и при необходимости добавьте вагоны и лиц.",
      extra: "Подписание доступно после сохранения и заполнения ключевых полей.",
    },
    steps: [
      {
        id: "ca1",
        tab: "document",
        label: "Станция и дата акта",
        check: (d) => !!d?.id_station && !!d?.act_date,
      },
      {
        id: "ca2",
        tab: "document",
        label: "Описание / тип простоя",
        check: (d) => !!(d?.downtime_type || (d?.description && String(d.description).trim())),
      },
      {
        id: "ca3",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  commercial_act: {
    title: "Коммерческий акт",
    hints: {
      primary: "Заполните номер поезда, дату и время прибытия, скорость и при необходимости сопровождение.",
      extra: "Номер накладной сверяйте с учебным заданием.",
    },
    steps: [
      {
        id: "co1",
        tab: "document",
        label: "Номер поезда и дата прибытия",
        check: (d) => !!(d?.train_number && String(d.train_number).trim()) && !!d?.arrival_date,
      },
      {
        id: "co2",
        tab: "document",
        label: "Время прибытия и скорость",
        check: (d) => !!d?.arrival_time && d?.id_speed_type != null,
      },
      {
        id: "co3",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  filling_statement: {
    title: "Ведомость подачи и уборки",
    hints: {
      primary: "Укажите станцию, договор, плательщика и места расчёта/передачи.",
      extra: "Итоговую сумму можно уточнить после заполнения всех обязательных полей.",
    },
    steps: [
      {
        id: "f1",
        tab: "document",
        label: "Станция и договор",
        check: (d) => !!d?.id_station && d?.id_contract != null,
      },
      {
        id: "f2",
        tab: "document",
        label: "Плательщик и место расчёта",
        check: (d) => d?.id_payer != null && !!d?.place_of_calculation,
      },
      {
        id: "f3",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },

  cumulative_statement: {
    title: "Накопительная ведомость",
    hints: {
      primary: "Задайте период, организацию-перевозчика, плательщика и место расчёта.",
      extra: "Проверьте сумму к оплате и реквизиты перед сохранением.",
    },
    steps: [
      {
        id: "cu1",
        tab: "document",
        label: "Период и перевозчик",
        check: (d) => !!d?.period_from && !!d?.period_to && d?.id_carrier_org != null,
      },
      {
        id: "cu2",
        tab: "document",
        label: "Плательщик и место расчёта",
        check: (d) => d?.id_payer != null && !!d?.place_of_calculation,
      },
      {
        id: "cu3",
        tab: "document",
        label: "Документ сохранён",
        check: (d) => d?.id != null && d.id !== "",
      },
    ],
  },
};

/** id кнопок вкладок Bootstrap в шаблонах форм (data-toggle="tab") */
export const TRAINING_TAB_BUTTON_IDS = {
  transportation: {
    document: "home-tab",
    sending: "profile-tab",
    freight: "profile-1-tab",
  },
  invoice: { document: "home-tab" },
  reminder: { document: "home-tab" },
  common_act: { document: "home-tab" },
  commercial_act: { document: "home-tab" },
  filling_statement: { document: "home-tab" },
  cumulative_statement: { document: "home-tab" },
};
