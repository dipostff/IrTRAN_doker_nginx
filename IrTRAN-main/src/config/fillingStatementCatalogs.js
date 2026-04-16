/**
 * Учебные справочники для ведомости подачи и уборки.
 * Станции, контрагенты, грузы, группы вагонов при наличии API подставляются из Pinia (getStations, getLegalEntities, getCargos, getRollingStockTypes).
 */

/** Тарифные планы (демо). */
export const TARIFF_PLAN_OPTIONS = [
    { id: "tp_2024_base", name: "Базовый тарифный план 2024 (п/у)" },
    { id: "tp_2024_reg", name: "Региональный план с надбавками" },
    { id: "tp_contract", name: "По условиям договора (индивидуальный)" },
];

/** Тип нумерации ведомости. */
export const STATEMENT_NUMBERING_TYPES = [
    { id: "six", name: "Шесть знаков (2 — месяц, 1 — пятидневка, 3 — порядковый номер)" },
    { id: "seq", name: "Сквозная нумерация за год" },
    { id: "contract", name: "По номеру договора и порядковому номеру" },
];

/** Принадлежность подъездного пути. */
export const TRACK_BRANCH_OPTIONS = [
    { id: "branch_owner", name: "Ветвевладельцу" },
    { id: "carrier", name: "Перевозчику" },
    { id: "joint", name: "Совместная инфраструктура" },
];

/** Операции (подача/уборка, погрузочные работы). */
export const FILLING_OPERATION_OPTIONS = [
    { id: "delivery", name: "Подача" },
    { id: "removal", name: "Уборка" },
    { id: "load", name: "Погрузка" },
    { id: "unload", name: "Выгрузка" },
    { id: "paired", name: "Сдвоенные операции" },
];

/**
 * Нормативное время на п/п (в т.ч. код «Ж» для КОО-4) — для подстановки в расчёты (учебные значения).
 */
export const NORM_TIME_ON_TRACK_OPTIONS = [
    { id: "z_koo4", name: 'Код «Ж» (КОО-4), 72 ч', hours: 72 },
    { id: "std_48", name: "Стандарт 48 ч", hours: 48 },
    { id: "std_24", name: "Ускоренный 24 ч", hours: 24 },
];

/** Операция для срока оборота (модальное окно вагона). */
export const TURNOVER_OPERATION_OPTIONS = [
    { id: "load", name: "Погрузка" },
    { id: "unload", name: "Выгрузка" },
    { id: "paired", name: "Сдвоенные операции" },
];

/** Демо-номера памяток уборки для ручного ввода/подбора. */
export const DEMO_CLEANING_REMINDER_NUMBERS = [
    { id: 1, number: "ПУ-2026/001", note: "Учебный" },
    { id: 2, number: "ПУ-2026/014", note: "Учебный" },
    { id: 3, number: "ПУ-2026/088", note: "Учебный" },
];
