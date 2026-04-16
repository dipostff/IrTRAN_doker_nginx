'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // document_types — тип документа (id 4 используется по умолчанию в заявке)
    const [dtRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM document_types');
    if (Number(dtRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('document_types', [
        { id: 1, name: 'Заявка на перевозку грузов', code: 1, created_at: now, updated_at: now },
        { id: 2, name: 'Заявка на подачу и уборку вагонов', code: 2, created_at: now, updated_at: now },
        { id: 3, name: 'Иная заявка', code: 3, created_at: now, updated_at: now },
        { id: 4, name: 'Заявка на перевозку', code: 4, created_at: now, updated_at: now },
      ]);
    }

    // message_types — вид сообщения
    const [mtRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM message_types');
    if (Number(mtRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('message_types', [
        { id: 1, name: 'Прямое', code: 1, created_at: now, updated_at: now },
        { id: 2, name: 'Местное', code: 2, created_at: now, updated_at: now },
        { id: 3, name: 'Прямое смешанное', code: 3, created_at: now, updated_at: now },
        { id: 4, name: 'Местное смешанное', code: 4, created_at: now, updated_at: now },
      ]);
    }

    // signs_sending — признак отправки
    const [ssRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM signs_sending');
    if (Number(ssRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('signs_sending', [
        { id: 1, name: 'Отправка', code: 1, created_at: now, updated_at: now },
        { id: 2, name: 'Получение', code: 2, created_at: now, updated_at: now },
      ]);
    }

    // ownerships — принадлежность вагонов/контейнеров
    const [owRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM ownerships');
    if (Number(owRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('ownerships', [
        { id: 1, name: 'Собственный парк', code: 1, created_at: now, updated_at: now },
        { id: 2, name: 'Арендованные', code: 2, created_at: now, updated_at: now },
        { id: 3, name: 'Железная дорога', code: 3, created_at: now, updated_at: now },
      ]);
    }

    // methods_submission — способ подачи
    const [msRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM methods_submission');
    if (Number(msRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('methods_submission', [
        { id: 1, name: 'На станцию', code: 1, created_at: now, updated_at: now },
        { id: 2, name: 'На подъездной путь', code: 2, created_at: now, updated_at: now },
      ]);
    }

    // send_types — вид отправки (для заявки и накладной)
    try {
      const [stRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM send_types');
      if (Number(stRows[0]?.c || 0) === 0) {
        await queryInterface.bulkInsert('send_types', [
          { id: 1, name: 'Повагонная', code_IODV: 1, abbreviation: 'ПВ', code_CO_11: 1, created_at: now, updated_at: now },
          { id: 2, name: 'Контейнерная', code_IODV: 2, abbreviation: 'КН', code_CO_11: 2, created_at: now, updated_at: now },
          { id: 3, name: 'Мелкая', code_IODV: 3, abbreviation: 'МЛ', code_CO_11: 3, created_at: now, updated_at: now },
        ]);
      }
    } catch (e) {
      // таблица может отсутствовать до миграций send_types
    }

    // speed_types — скорость (для накладной)
    try {
      const [spRows] = await queryInterface.sequelize.query('SELECT COUNT(*) as c FROM speed_types');
      if (Number(spRows[0]?.c || 0) === 0) {
        await queryInterface.bulkInsert('speed_types', [
          { id: 1, name: 'Грузовая', code: 1, created_at: now, updated_at: now },
          { id: 2, name: 'Пассажирская', code: 2, created_at: now, updated_at: now },
        ]);
      }
    } catch (e) {
      // таблица может отсутствовать до миграций speed_types
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('document_types', null, {});
    await queryInterface.bulkDelete('message_types', null, {});
    await queryInterface.bulkDelete('signs_sending', null, {});
    await queryInterface.bulkDelete('ownerships', null, {});
    await queryInterface.bulkDelete('methods_submission', null, {});
    await queryInterface.bulkDelete('send_types', null, {}).catch(() => {});
    await queryInterface.bulkDelete('speed_types', null, {}).catch(() => {});
  },
};
