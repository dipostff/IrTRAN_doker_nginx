/**
 * Клиентская проверка перед сохранением в режиме тренажёра при включённой «Проверке ошибок».
 * Возвращает текст ошибки или null.
 */

export function validateTrainingDocument(docType, doc) {
  switch (docType) {
    case "invoice":
      return validateInvoice(doc);
    case "reminder":
      return validateReminder(doc);
    case "common_act":
      return validateCommonAct(doc);
    case "commercial_act":
      return validateCommercialAct(doc);
    case "filling_statement":
      return validateFillingStatement(doc);
    case "cumulative_statement":
      return validateCumulativeStatement(doc);
    default:
      return null;
  }
}

function validateInvoice(d) {
  if (!d?.invoice_type) return "Укажите тип накладной.";
  if (d?.id_blank_type == null || d.id_blank_type === "") return "Укажите тип бланка.";
  if (!d?.id_station_departure || !d?.id_station_destination) return "Укажите станции отправления и назначения.";
  if (!d?.id_shipper || !d?.id_receiver) return "Укажите грузоотправителя и получателя.";
  if (d?.id_send_type == null || d.id_send_type === "") return "Укажите вид отправки.";
  if (d?.id_speed_type == null || d.id_speed_type === "") return "Укажите скорость.";
  return null;
}

function validateReminder(d) {
  if (!d?.reminder_type) return "Укажите тип памятки.";
  if (!d?.id_station) return "Укажите станцию.";
  return null;
}

function validateCommonAct(d) {
  if (!d?.id_station) return "Укажите станцию составления акта.";
  if (!d?.act_date) return "Укажите дату акта.";
  if (!d?.downtime_type && !(d?.description && String(d.description).trim())) {
    return "Укажите тип простоя или описание.";
  }
  return null;
}

function validateCommercialAct(d) {
  if (!d?.train_number || !String(d.train_number).trim()) return "Укажите номер поезда.";
  if (!d?.arrival_date) return "Укажите дату прибытия.";
  if (!d?.arrival_time) return "Укажите время прибытия.";
  if (d?.id_speed_type == null || d.id_speed_type === "") return "Укажите скорость.";
  return null;
}

function validateFillingStatement(d) {
  if (!d?.id_station) return "Укажите станцию.";
  if (d?.id_contract == null || d.id_contract === "") return "Укажите договор.";
  if (d?.id_payer == null || d.id_payer === "") return "Укажите плательщика.";
  if (!d?.place_of_calculation) return "Укажите место расчёта.";
  return null;
}

function validateCumulativeStatement(d) {
  if (!d?.period_from || !d?.period_to) return "Укажите период ведомости.";
  if (d?.id_carrier_org == null || d.id_carrier_org === "") return "Укажите организацию-перевозчика.";
  if (d?.id_payer == null || d.id_payer === "") return "Укажите плательщика.";
  if (!d?.place_of_calculation) return "Укажите место расчёта.";
  return null;
}
