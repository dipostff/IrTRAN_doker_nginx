const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');
const DocumentType = require('./DocumentType');
const MessageType = require('./MessageType');
const SignSending = require('./SignSending');
const Countrie = require('./Countrie');
const LegalEntities = require('./LegalEntities');
const Ownership = require('./Ownership');
const OwnerNonPublicRailway = require('./OwnerNonPublicRailway');
const ApprovalWithOwner = require('./ApprovalWithOwner');
const CargoGroup = require('./CargoGroup');
const MethodSubmission = require('./MethodSubmission');
const Sending = require('./Sending');
const SubmissionSchedule = require('./SubmissionSchedule');
const Payer = require('./Payer');

const RequestTransportation = sequelize.define('RequestTransportation', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  id_document_type: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  registration_date: {
    type: DataTypes.DATE
  },
  transportation_date_from: {
    type: DataTypes.DATE
  },
  transportation_date_to: {
    type: DataTypes.DATE
  },
  id_message_type: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_sign_sending: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_country_departure: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_country_departure_point: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_shipper: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  is_departure_station: {
    type: DataTypes.BOOLEAN
  },
  addr: {
    type: DataTypes.STRING(255)
  },
  id_carriage_ownership: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_loading_organizer: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  is_common_areas: {
    type: DataTypes.BOOLEAN
  },
  contract_number: {
    type: DataTypes.STRING(255)
  },
  id_owner_non_public_railway: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_approval_with_owner: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  approval_with_owner_date: {
    type: DataTypes.DATE
  },
  id_cargo_group: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  id_method_submission: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  is_form_3: {
    type: DataTypes.BOOLEAN
  },
  description: {
    type: DataTypes.STRING(4095)
  },
  is_transmitted_by_fax: {
    type: DataTypes.BOOLEAN
  },
  document_status: {
    type: DataTypes.INTEGER.UNSIGNED
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
}, {
  tableName: 'requests_transportation'
});

const belongsTo = [{
    model: DocumentType,
    foreignKey: 'id_document_type'
  }, {
    model: MessageType,
    foreignKey: 'id_message_type'
  }, {
    model: SignSending,
    foreignKey: 'id_sign_sending'
  }, {
    model: Countrie,
    foreignKey: 'id_country_departure'
  }, {
    model: Countrie,
    foreignKey: 'id_country_departure_point'
  }, {
    model: LegalEntities,
    foreignKey: 'id_shipper'
  }, {
    model: Ownership,
    foreignKey: 'id_carriage_ownership'
  }, {
    model: LegalEntities,
    foreignKey: 'id_loading_organizer'
  }, {
    model: OwnerNonPublicRailway,
    foreignKey: 'id_owner_non_public_railway'
  }, {
    model: ApprovalWithOwner,
    foreignKey: 'id_approval_with_owner'
  }, {
    model: CargoGroup,
    foreignKey: 'id_cargo_group'
  }, {
    model: MethodSubmission,
    foreignKey: 'id_method_submission'
  },
];

RequestTransportation.belongsToMany(Sending, { 
  through: 'requests_transportation_sending',
  foreignKey: 'id_request_transportation', // ключ для текущей модели
  otherKey: 'id_sending',     // ключ для связанной модели
});
RequestTransportation.belongsToMany(SubmissionSchedule, { 
  through: 'requests_transportation_submission_schedules',
  foreignKey: 'id_request_transportation', // ключ для текущей модели
  otherKey: 'id_submission_schedule',     // ключ для связанной модели
});
RequestTransportation.belongsToMany(Payer, { 
  through: 'requests_transportation_payers',
  foreignKey: 'id_request_transportation', // ключ для текущей модели
  otherKey: 'id_payer',     // ключ для связанной модели
});

for(const bTo of belongsTo) {
  RequestTransportation.belongsTo(bTo.model, {
    foreignKey: bTo.foreignKey
  });
}

module.exports = RequestTransportation;