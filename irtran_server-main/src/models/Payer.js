const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');
const PayerType = require('./PayerType');
const LegalEntities = require('./LegalEntities');
const Countrie = require('./Countrie');

const Payer = sequelize.define('Payer', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    id_payer_type: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_country_transportation: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    id_payer: {
      type: DataTypes.INTEGER.UNSIGNED
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
    note: {
      type: DataTypes.STRING(4095)
    },
  }, {
    tableName: 'payers'
  }
);

const belongsTo = [{
    model: PayerType,
    foreignKey: 'id_payer_type'
  }, {
    model: Countrie,
    foreignKey: 'id_country_transportation'
  }, {
    model: LegalEntities,
    foreignKey: 'id_payer'
  },
];

for(const bTo of belongsTo) {
  Payer.belongsTo(bTo.model, {
    foreignKey: bTo.foreignKey
  });
}

module.exports = Payer;
