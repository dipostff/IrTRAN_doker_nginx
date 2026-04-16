export const CUMULATIVE_SOURCE_DOCUMENTS = [
    { id: "invoice", name: "Накладная" },
    { id: "filling_statement", name: "Ведомость подачи и уборки" },
    { id: "reminder", name: "Памятка приемосдатчика" },
    { id: "manual", name: "Ручной ввод" },
];

export const CUMULATIVE_FEE_ARTICLES = [
    { id: "A101", code: "A101", name: "Сбор за подачу/уборку", note: "Базовый сбор" },
    { id: "A102", code: "A102", name: "Сбор за пользование ПП", note: "По данным ведомости" },
    { id: "A201", code: "A201", name: "Плата за нахождение", note: "Простой вагонов" },
    { id: "A301", code: "A301", name: "Штраф", note: "По уведомлению" },
];

export const CUMULATIVE_ADDITIONAL_CODES = [
    { id: "D01", code: "D01", name: "Ночная смена", note: "Повышающий коэффициент" },
    { id: "D02", code: "D02", name: "Выходной/праздничный день", note: "Надбавка" },
    { id: "D03", code: "D03", name: "Без дополнительных условий", note: "Коэффициент 1.0" },
];

export const CUMULATIVE_NDS_OPTIONS = [
    { id: "nds_20", name: "С НДС 20%", rate: 20 },
    { id: "nds_12", name: "С НДС 12%", rate: 12 },
    { id: "nds_0", name: "Без НДС", rate: 0 },
];
