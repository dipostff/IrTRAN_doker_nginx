const { DataTypes } = require('sequelize');
const sequelize = require('./../modules/sequelize/db');
const SendNumber = require('./SendNumber');

const SubmissionSchedule = sequelize.define('SubmissionSchedule', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    id_send_number: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    submission_date: {
      type: DataTypes.DATE
    },
    weight: {
      type: DataTypes.INTEGER.UNSIGNED
    },
    count_wagon: {
      type: DataTypes.INTEGER.UNSIGNED
    }
  }, {
    tableName: 'submission_schedules'
  }
);

const belongsTo = [{
    model: SendNumber,
    foreignKey: 'id_send_number'
  },
];

for(const bTo of belongsTo) {
  SubmissionSchedule.belongsTo(bTo.model, {
    foreignKey: bTo.foreignKey
  });
}

module.exports = SubmissionSchedule;
