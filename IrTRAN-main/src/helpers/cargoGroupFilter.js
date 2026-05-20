/**
 * Сопоставление груза ЕТСНГ с группой груза по тарифному руководству:
 * cargo.number_group ↔ cargo_groups.code
 */

export function normalizeGroupCode(value) {
    if (value == null || value === "") return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) return String(asNumber);
    return trimmed;
}

export function cargoBelongsToGroup(cargo, cargoGroup) {
    if (!cargo || !cargoGroup) return false;
    const cargoCode = normalizeGroupCode(cargo.number_group);
    const groupCode = normalizeGroupCode(cargoGroup.code);
    return cargoCode != null && groupCode != null && cargoCode === groupCode;
}

/**
 * @param {Record<string|number, object>} cargos
 * @param {{ cargoGroupId?: number|null, cargoGroups?: Record, allowedCargoIds?: number[]|null, requireGroup?: boolean }} options
 */
export function filterCargosByGroup(cargos, options = {}) {
    const {
        cargoGroupId = null,
        cargoGroups = {},
        allowedCargoIds = null,
        requireGroup = true,
    } = options;

    const group =
        cargoGroupId != null && cargoGroups[cargoGroupId] != null
            ? cargoGroups[cargoGroupId]
            : null;

    if (requireGroup && !group) return {};

    const allowedSet =
        Array.isArray(allowedCargoIds) && allowedCargoIds.length > 0
            ? new Set(allowedCargoIds.map((x) => Number(x)))
            : null;

    const out = {};
    for (const [id, cargo] of Object.entries(cargos || {})) {
        if (!cargo) continue;
        if (group && !cargoBelongsToGroup(cargo, group)) continue;
        if (allowedSet && !allowedSet.has(Number(id))) continue;
        out[id] = cargo;
    }
    return out;
}

/** Грузы без соответствующей группы в справочнике (для проверки данных). */
export function findCargosWithoutMatchingGroup(cargos, cargoGroups) {
    const groupCodes = new Set(
        Object.values(cargoGroups || {})
            .map((g) => normalizeGroupCode(g?.code))
            .filter(Boolean)
    );
    return Object.entries(cargos || {})
        .filter(([, cargo]) => {
            const code = normalizeGroupCode(cargo?.number_group);
            return !code || !groupCodes.has(code);
        })
        .map(([id, cargo]) => ({ id: Number(id), cargo }));
}
