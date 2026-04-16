const { resolveStaticField } = require('./pdfTrainingCatalogs');

function normId(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isFinite(n) && String(n) === String(value).trim()) return n;
  return value;
}

function lookup(map, value, fallbackPrefix) {
  const id = normId(value);
  if (id == null) return null;
  const label = map[id] ?? map[String(id)];
  if (label != null) return String(label);
  return `${fallbackPrefix} id ${value}`;
}

/**
 * @param {object} maps — результат loadPdfDictionaryMaps
 * @param {string} [documentType] — для неоднозначных полей (напр. id_owner)
 */
function createPdfResolveContext(maps, documentType = '') {
  const m = maps || {};

  function station(v) {
    return lookup(m.stationById, v, 'Станция');
  }

  function legalEntity(v) {
    return lookup(m.legalEntityById, v, 'Организация');
  }

  function ownerNonPublic(v) {
    return lookup(m.ownerNonPublicById, v, 'Владелец пути');
  }

  /** id_owner: в памятке — владелец п/п; в контейнере накладной — юрлицо */
  function ownerField(v) {
    if (documentType === 'reminder' || documentType === 'filling_statement') {
      return ownerNonPublic(v) || legalEntity(v);
    }
    if (documentType === 'invoice') return legalEntity(v) || ownerNonPublic(v);
    return legalEntity(v) || ownerNonPublic(v);
  }

  function cargo(v) {
    return lookup(m.cargoById, v, 'Груз');
  }

  function ownership(v) {
    return lookup(m.ownershipById, v, 'Собственность');
  }

  function rollingStockType(v) {
    return lookup(m.rollingStockTypeById, v, 'Род ПС');
  }

  function country(v) {
    return lookup(m.countryById, v, 'Страна');
  }

  function speedType(v) {
    return lookup(m.speedTypeById, v, 'Вид отправки');
  }

  function sendType(v) {
    return lookup(m.sendTypeById, v, 'Вид отправки');
  }

  function contract(v) {
    return lookup(m.contractById, v, 'Договор');
  }

  function documentTypeById(v) {
    return lookup(m.documentTypeById, v, 'Тип бланка');
  }

  function transportPackageType(v) {
    return lookup(m.transportPackageTypeById, v, 'Вид упаковки');
  }

  function destinationIndication(v) {
    return lookup(m.destinationIndicationById, v, 'Признак');
  }

  function requestTransportation(v) {
    return lookup(m.transportationById, v, 'Заявка');
  }

  function submissionSchedule(v) {
    return lookup(m.submissionScheduleById, v, 'График');
  }

  /**
   * Человекочитаемое значение для поля payload (ключ как в JSON формы).
   */
  function formatField(fieldKey, value) {
    if (value == null || value === '') return null;
    const staticLabel = resolveStaticField(fieldKey, value);
    if (staticLabel) return staticLabel;

    switch (fieldKey) {
      case 'id_station':
      case 'id_station_departure':
      case 'id_station_destination':
      case 'id_locomotive_station':
        return station(value);
      case 'id_shipper':
      case 'id_receiver':
      case 'id_payer':
      case 'id_carrier_org':
      case 'id_counterparty':
        return legalEntity(value);
      case 'id_owner':
        return ownerField(value);
      case 'id_cargo':
        return cargo(value);
      case 'id_ownership':
        return ownership(value);
      case 'id_rolling_stock_type':
      case 'id_rolling_type':
        return rollingStockType(value);
      case 'id_country':
      case 'id_country_departure':
      case 'id_country_destination':
      case 'id_place_of_payment':
        return country(value);
      case 'id_speed_type':
        return speedType(value);
      case 'id_send_type':
        return sendType(value);
      case 'id_contract':
        return contract(value);
      case 'id_blank_type':
        return documentTypeById(value);
      case 'id_request_transportation':
        return requestTransportation(value);
      case 'id_submission_schedule':
        return submissionSchedule(value);
      default:
        return null;
    }
  }

  return {
    formatField,
    station,
    legalEntity,
    ownerNonPublic,
    legalEntityOrOwner: ownerField,
    cargo,
    ownership,
    rollingStockType,
    country,
    speedType,
    sendType,
    contract,
    documentTypeById,
    requestTransportation,
    submissionSchedule,
    maps: m,
  };
}

module.exports = {
  createPdfResolveContext,
};
