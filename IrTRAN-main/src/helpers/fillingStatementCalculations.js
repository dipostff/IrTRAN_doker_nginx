/** Утилиты и учебные формулы пересчёта для ведомости подачи и уборки. */

export function parseNum(s) {
    if (s == null || s === "") return 0;
    const n = parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export function fmtNum(n) {
    if (!Number.isFinite(n)) return "";
    return String(Math.round(n * 100) / 100);
}

/** Длительность в часах между строками datetime-local (YYYY-MM-DDTHH:mm). */
export function hoursBetweenLocalDateTime(start, end) {
    if (!start || !end) return 0;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return Math.round(((b - a) / 3600000) * 100) / 100;
}

/**
 * Пересчёт производных сумм по коэффициентам (блок «Сбор за подачу/уборку» и аналогичный блок «Штраф»).
 * baseAmount — опорная сумма (например сбор за подачу/уборку или плата за пользование).
 */
export function applyCoefficientDerivatives(target, baseAmount) {
    const base = parseNum(baseAmount);
    const cS = parseNum(target.coeff_safety) || 1;
    const cT = parseNum(target.coeff_tax) || 1;
    const cC = parseNum(target.coeff_cap) || 1;

    target.sum_payment_wo_nonindexed = fmtNum(base);
    target.sum_wo_safety = fmtNum(base / cS);
    target.sum_wo_tax = fmtNum(base / cT);
    target.sum_wo_extra = fmtNum(base / cC);

    target.income_safety = fmtNum(base - parseNum(target.sum_wo_safety));
    target.income_tax = fmtNum(base - parseNum(target.sum_wo_tax));
    target.income_cap = fmtNum(base - parseNum(target.sum_wo_extra));
}

/** Итог по блоку штрафа: сумма ключевых начислений (учебная агрегация). */
export function sumFineTotal(fine) {
    const parts = [
        parseNum(fine.accrued),
        parseNum(fine.usage_fee),
        parseNum(fine.presence_fee),
        parseNum(fine.shunting),
        parseNum(fine.mileage),
        parseNum(fine.income_safety),
        parseNum(fine.income_tax),
        parseNum(fine.income_cap),
    ];
    return parts.reduce((a, b) => a + b, 0);
}
