const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');
const Cargo = require('./Cargo');
const TransportPackageType = require('./TransportPackageType');
const SendType = require('./SendType'); //
const RollingStockType = require('./RollingStockType');
const SpeedType = require('./SpeedType'); //
const LegalEntities = require('./LegalEntities');
const Countrie = require('./Countrie');
const Station = require('./Station');
const Contract = require('./Contract');
const DestinationIndication = require('./DestinationIndication');

const Sending = sequelize.define('Sending', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    id_cargo: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_transport_package_type: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    is_train_formation: {
      type: DataTypes.BOOLEAN
    },
    id_send_type: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_rolling_stock_type: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_speed_type: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_owner_wagon: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    weight: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    count_wagon: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_country_destination: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_station_destination: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_station_out: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_transshipment_point: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_organization_TP: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    is_alternative_route: {
      type: DataTypes.BOOLEAN
    },
    id_receiver: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    is_among_as: {
      type: DataTypes.BOOLEAN
    },
    OKPO: {
      type: DataTypes.STRING(255)
    },
    name: {
      type: DataTypes.STRING(255)
    },
    addr: {
      type: DataTypes.STRING(255)
    },
    code_exclusive_tariff: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.STRING(4095)
    },
    id_contract_special_terms: {
      type: DataTypes.INTEGER.UNSIGNED
    },
  }, {
    tableName: 'sending'
  }
);

const belongsTo = [{
    model: Cargo,
    foreignKey: 'id_cargo'
  }, {
    model: TransportPackageType,
    foreignKey: 'id_transport_package_type'
  }, {
    model: SendType,
    foreignKey: 'id_send_type'
  }, {
    model: RollingStockType,
    foreignKey: 'id_rolling_stock_type'
  }, {
    model: SpeedType,
    foreignKey: 'id_speed_type'
  }, {
    model: LegalEntities,
    foreignKey: 'id_owner_wagon'
  }, {
    model: Countrie,
    foreignKey: 'id_country_destination'
  }, {
    model: Station,
    foreignKey: 'id_station_destination'
  }, {
    model: Station,
    foreignKey: 'id_station_out'
  }, {
    model: Station,
    foreignKey: 'id_transshipment_point'
  }, {
    model: LegalEntities,
    foreignKey: 'id_organization_TP'
  }, {
    model: LegalEntities,
    foreignKey: 'id_receiver'
  }, {
    model: Contract,
    foreignKey: 'id_contract_special_terms'
  },
];

Sending.belongsToMany(DestinationIndication, { 
  through: 'sending_destination_indications',
  foreignKey: 'id_sending', // ключ для текущей модели
  otherKey: 'id_destination_indication',     // ключ для связанной модели
});

for(const bTo of belongsTo) {
  Sending.belongsTo(bTo.model, {
    foreignKey: bTo.foreignKey
  });
}

module.exports = Sending;
