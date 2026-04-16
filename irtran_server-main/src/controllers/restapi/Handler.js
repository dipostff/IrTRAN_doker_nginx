//-----------Подключаемые модули-----------//
const Post = require('./../../modules/HTTP/Post');
const RequestTransportation = require('./../../models/RequestTransportation');
const DocumentType = require('./../../models/DocumentType');
const MessageType = require('./../../models/MessageType');
const SignSending = require('./../../models/SignSending');
const Countrie = require('./../../models/Countrie');
const LegalEntities = require('./../../models/LegalEntities');
const Ownership = require('./../../models/Ownership');
const OwnerNonPublicRailway = require('./../../models/OwnerNonPublicRailway');
const ApprovalWithOwner = require('./../../models/ApprovalWithOwner');
const CargoGroup = require('./../../models/CargoGroup');
const MethodSubmission = require('./../../models/MethodSubmission');
const Station = require('./../../models/Station');
const Sending = require('./../../models/Sending');
const Cargo = require('./../../models/Cargo');
const TransportPackageType = require('./../../models/TransportPackageType');
const RollingStockType = require('./../../models/RollingStockType');
const Contract = require('./../../models/Contract');
const DestinationIndication = require('./../../models/DestinationIndication');
const SubmissionSchedule = require('./../../models/SubmissionSchedule');
const SendNumber = require('./../../models/SendNumber');
const Payer = require('./../../models/Payer');
const PayerType = require('./../../models/PayerType');
const SpeedType = require('./../../models/SpeedType');
const SendType = require('./../../models/SendType');
//-----------Подключаемые модули-----------//

/**
 * Класс, являющийся обработчиком запросов
 */
class Handler {

  /**
   * Функция, которая по виду опроса определяет что с ним делать и куда направить
   */
  static async Requests(message) {
    let result;

    switch (message.type_request) {
      case "POST /requests_transportation":
        result = await Post.CRUD(message, RequestTransportation);
        break;
      case "POST /document_types":
        result = await Post.CRUD(message, DocumentType);
        break;
      case "POST /message_types":
        result = await Post.CRUD(message, MessageType);
        break;
      case "POST /signs_sending":
        result = await Post.CRUD(message, SignSending);
        break;
      case "POST /countries":
        result = await Post.CRUD(message, Countrie);
        break;
      case "POST /legal_entities":
        result = await Post.CRUD(message, LegalEntities);
        break;
      case "POST /ownerships":
        result = await Post.CRUD(message, Ownership);
        break;
      case "POST /owners_non_public_railway":
        result = await Post.CRUD(message, OwnerNonPublicRailway);
        break;
      case "POST /approvals_with_owner":
        result = await Post.CRUD(message, ApprovalWithOwner);
        break;
      case "POST /cargo_groups":
        result = await Post.CRUD(message, CargoGroup);
        break;
      case "POST /methods_submission":
        result = await Post.CRUD(message, MethodSubmission);
        break;
      case "POST /stations":
        result = await Post.CRUD(message, Station);
        break;
      case "POST /sending":
        result = await Post.CRUD(message, Sending);
        break;
      case "POST /cargo":
        result = await Post.CRUD(message, Cargo);
        break;
      case "POST /transport_package_types":
        result = await Post.CRUD(message, TransportPackageType);
        break;
      case "POST /rolling_stock_types":
        result = await Post.CRUD(message, RollingStockType);
        break;
      case "POST /contracts":
        result = await Post.CRUD(message, Contract);
        break;
      case "POST /destination_indications":
        result = await Post.CRUD(message, DestinationIndication);
        break;
      case "POST /submission_schedules":
        result = await Post.CRUD(message, SubmissionSchedule);
        break;
      case "POST /send_numbers":
        result = await Post.CRUD(message, SendNumber);
        break;
      case "POST /payers":
        result = await Post.CRUD(message, Payer);
        break;
      case "POST /payer_types":
        result = await Post.CRUD(message, PayerType);
        break;
      case "POST /speed_types":
        result = await Post.CRUD(message, SpeedType);
        break;
      case "POST /send_types":
        result = await Post.CRUD(message, SendType);
        break;
      default:
        result = { message: "type_request bad" };
    }

    return result;
  }

  /**
   * Функция, которая направляет запрос на обработку, а после возвращает результат обработки
   */
  static async Route(message) {
    let result;

    let start = new Date().getTime();
    console.log(`Обрабатываем ${message.type_request} запрос...`);
    console.log(message);

    result = await Handler.Requests(message);

    let finish = new Date().getTime();
    console.log(`${message.type_request} обработан за {${(finish - start) / 1000}} сек.`);

    return result;
  }
}
//-----------Экспортируемые модули-----------//
module.exports = Handler;
//-----------Экспортируемые модули-----------//