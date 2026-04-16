const { Op } = require('sequelize');
const Station = require('../../models/Station');
const LegalEntities = require('../../models/LegalEntities');
const Cargo = require('../../models/Cargo');
const Ownership = require('../../models/Ownership');
const RollingStockType = require('../../models/RollingStockType');
const Countrie = require('../../models/Countrie');
const SpeedType = require('../../models/SpeedType');
const SendType = require('../../models/SendType');
const Contract = require('../../models/Contract');
const OwnerNonPublicRailway = require('../../models/OwnerNonPublicRailway');
const DocumentType = require('../../models/DocumentType');
const TransportPackageType = require('../../models/TransportPackageType');
const DestinationIndication = require('../../models/DestinationIndication');
const SubmissionSchedule = require('../../models/SubmissionSchedule');
const RequestTransportation = require('../../models/RequestTransportation');

function collectNumericIdsFromPayload(payload, fieldName) {
  const s = new Set();
  function walk(node) {
    if (node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === fieldName && v != null && v !== '') {
        const n = Number(v);
        if (Number.isFinite(n)) s.add(n);
      }
      walk(v);
    }
  }
  walk(payload);
  return [...s];
}

function mapById(rows, format) {
  const m = Object.create(null);
  for (const r of rows || []) {
    if (r.id == null) continue;
    m[r.id] = format(r);
  }
  return m;
}

function formatStation(r) {
  const parts = [r.name || r.short_name].filter(Boolean);
  if (r.code != null && r.code !== '') parts.push(`код ${r.code}`);
  return parts.join(', ') || `Станция id ${r.id}`;
}

function formatLegalEntity(r) {
  const name = r.name || '';
  const inn = r.INN != null ? r.INN : r.inn;
  if (name && inn) return `${name} (ИНН ${inn})`;
  return name || `Организация id ${r.id}`;
}

function formatCargo(r) {
  const n = r.name || r.short_name || '';
  const c = r.code_ETSNG || r.code_etsng;
  if (n && c) return `${n} (ЕТСНГ ${c})`;
  return n || `Груз id ${r.id}`;
}

function formatRequestTransportation(r) {
  const reg = r.registration_date
    ? String(r.registration_date).slice(0, 10)
    : '';
  return reg ? `Заявка №${r.id} от ${reg}` : `Заявка №${r.id}`;
}

function formatSubmissionSchedule(r) {
  const d = r.submission_date ? String(r.submission_date).slice(0, 10) : '';
  return d ? `График подачи №${r.id}, дата ${d}` : `График подачи №${r.id}`;
}

/**
 * Загружает подписи справочников из БД для подстановки в PDF.
 * @param {object} payload — тело документа (для выборочной загрузки заявок и графиков).
 */
async function loadPdfDictionaryMaps(payload = {}) {
  const transportationIds = collectNumericIdsFromPayload(payload, 'id_request_transportation');
  const submissionIds = collectNumericIdsFromPayload(payload, 'id_submission_schedule');

  const queries = [
    Station.findAll({ raw: true, attributes: ['id', 'name', 'short_name', 'code'] }),
    LegalEntities.findAll({ raw: true, attributes: ['id', 'name', 'INN'] }),
    Cargo.findAll({ raw: true, attributes: ['id', 'name', 'short_name', 'code_ETSNG'] }),
    Ownership.findAll({ raw: true, attributes: ['id', 'name', 'code'] }),
    RollingStockType.findAll({ raw: true, attributes: ['id', 'name', 'code', 'abbreviation'] }),
    Countrie.findAll({ raw: true, attributes: ['id', 'name', 'short_name', 'OSCM_code'] }),
    SpeedType.findAll({ raw: true, attributes: ['id', 'name', 'code'] }),
    SendType.findAll({ raw: true, attributes: ['id', 'name', 'abbreviation'] }),
    Contract.findAll({ raw: true, attributes: ['id', 'name', 'short_name', 'code'] }),
    OwnerNonPublicRailway.findAll({ raw: true, attributes: ['id', 'name', 'code'] }),
    DocumentType.findAll({ raw: true, attributes: ['id', 'name', 'code'] }),
    TransportPackageType.findAll({ raw: true, attributes: ['id', 'name', 'short_name', 'code'] }),
    DestinationIndication.findAll({ raw: true, attributes: ['id', 'name', 'code'] }),
  ];

  const [
    stations,
    legalEntities,
    cargos,
    ownerships,
    rollingStockTypes,
    countries,
    speedTypes,
    sendTypes,
    contracts,
    ownersNonPublic,
    documentTypes,
    transportPackageTypes,
    destinationIndications,
  ] = await Promise.all(queries);

  let transportationById = Object.create(null);
  if (transportationIds.length) {
    const rows = await RequestTransportation.findAll({
      where: { id: { [Op.in]: transportationIds } },
      raw: true,
      attributes: ['id', 'registration_date'],
    });
    transportationById = mapById(rows, formatRequestTransportation);
  }

  let submissionScheduleById = Object.create(null);
  if (submissionIds.length) {
    const rows = await SubmissionSchedule.findAll({
      where: { id: { [Op.in]: submissionIds } },
      raw: true,
      attributes: ['id', 'submission_date'],
    });
    submissionScheduleById = mapById(rows, formatSubmissionSchedule);
  }

  return {
    stationById: mapById(stations, formatStation),
    legalEntityById: mapById(legalEntities, formatLegalEntity),
    cargoById: mapById(cargos, formatCargo),
    ownershipById: mapById(ownerships, (r) => r.name || `Собственность id ${r.id}`),
    rollingStockTypeById: mapById(
      rollingStockTypes,
      (r) => r.name || r.abbreviation || `Род ПС id ${r.id}`
    ),
    countryById: mapById(
      countries,
      (r) => r.name || r.short_name || `Страна id ${r.id}`
    ),
    speedTypeById: mapById(speedTypes, (r) => r.name || `Вид отправки id ${r.id}`),
    sendTypeById: mapById(
      sendTypes,
      (r) => r.name || r.abbreviation || `Вид отправки id ${r.id}`
    ),
    contractById: mapById(contracts, (r) => r.name || r.short_name || `Договор id ${r.id}`),
    ownerNonPublicById: mapById(
      ownersNonPublic,
      (r) => r.name || `Владелец пути id ${r.id}`
    ),
    documentTypeById: mapById(
      documentTypes,
      (r) => r.name || `Тип документа id ${r.id}`
    ),
    transportPackageTypeById: mapById(
      transportPackageTypes,
      (r) => r.name || r.short_name || `Упаковка id ${r.id}`
    ),
    destinationIndicationById: mapById(
      destinationIndications,
      (r) => r.name || `Признак id ${r.id}`
    ),
    transportationById,
    submissionScheduleById,
  };
}

module.exports = {
  loadPdfDictionaryMaps,
  collectNumericIdsFromPayload,
};
