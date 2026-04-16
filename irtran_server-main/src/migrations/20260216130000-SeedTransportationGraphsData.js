'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Страны (countries)
    const [countryRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM countries'
    );
    if (Number(countryRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('countries', [
        {
          id: 1,
          OSCM_code: '643',
          name: 'Российская Федерация',
          short_name: 'Россия',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          OSCM_code: '112',
          name: 'Республика Беларусь',
          short_name: 'Беларусь',
          created_at: now,
          updated_at: now
        },
        {
          id: 3,
          OSCM_code: '398',
          name: 'Республика Казахстан',
          short_name: 'Казахстан',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Станции (stations)
    const [stationRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM stations'
    );
    if (Number(stationRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('stations', [
        {
          id: 1,
          code: '200000',
          name: 'Москва-Товарная',
          short_name: 'Москва-Тов.',
          railway: 'МСК',
          paragraph: 'П1',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          code: '210000',
          name: 'Санкт-Петербург-Сортировочный',
          short_name: 'СПб-Сорт.',
          railway: 'СПБ',
          paragraph: 'П2',
          created_at: now,
          updated_at: now
        },
        {
          id: 3,
          code: '300000',
          name: 'Екатеринбург-Товарный',
          short_name: 'Екб-Тов.',
          railway: 'ЕКБ',
          paragraph: 'П3',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Хоз. субъекты (legal_entities) – грузоотправитель, грузополучатель, владелец путей, плательщик
    const [leRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM legal_entities'
    );
    if (Number(leRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('legal_entities', [
        {
          id: 1,
          OKPO: '00000001',
          INN: '7700000001',
          name: 'ООО "Грузоотправитель 1"',
          TGNL_code: '1001',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          OKPO: '00000002',
          INN: '7800000002',
          name: 'АО "Грузополучатель 1"',
          TGNL_code: '1002',
          created_at: now,
          updated_at: now
        },
        {
          id: 3,
          OKPO: '00000003',
          INN: '6600000003',
          name: 'ООО "Владелец подъездного пути 1"',
          TGNL_code: '1003',
          created_at: now,
          updated_at: now
        },
        {
          id: 4,
          OKPO: '00000004',
          INN: '7700000004',
          name: 'ООО "Экспедитор/Плательщик 1"',
          TGNL_code: '1004',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Владелец ЖД пути необщего пользования (owners_non_public_railway)
    const [ownerNprRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM owners_non_public_railway'
    );
    if (Number(ownerNprRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('owners_non_public_railway', [
        {
          id: 1,
          name: 'ООО "Владелец пути необщего пользования 1"',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Группы груза (cargo_groups)
    // Пропускаем заполнение cargo_groups и cargo:
    // эти таблицы обычно уже заполнены в учебной/боевой БД,
    // а их структура отличается между версиями, что ведёт к ошибкам миграций.

    // Вид транспортной упаковки (transport_package_types)
    const [tpRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM transport_package_types'
    );
    if (Number(tpRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('transport_package_types', [
        {
          id: 1,
          code: 1,
          name: 'Навалочно',
          short_name: 'нав.',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          code: 2,
          name: 'В мешках',
          short_name: 'мешки',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Вид подвижного состава (rolling_stock_types)
    const [rstRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM rolling_stock_types'
    );
    if (Number(rstRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('rolling_stock_types', [
        {
          id: 1,
          code: 12100,
          name: 'Полувагон',
          abbreviation: 'ПВ',
          RPP: 'PV',
          code_invoice_wagon: 'PV',
          name_invoice_wagon: 'Полувагон',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          code: 111804,
          name: 'Крытый вагон',
          abbreviation: 'КР',
          RPP: 'KR',
          code_invoice_wagon: 'KR',
          name_invoice_wagon: 'Крытый вагон',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Указания назначения (destination_indications) – пункт перевалки и т.п.
    const [diRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM destination_indications'
    );
    if (Number(diRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('destination_indications', [
        {
          id: 1,
          name: 'Прямая доставка',
          created_at: now,
          updated_at: now
        },
        {
          id: 2,
          name: 'Через пункт перевалки',
          created_at: now,
          updated_at: now
        }
      ]);
    }

    // Контракты (contracts) – для специальных условий тарифа
    const [contractRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM contracts'
    );
    if (Number(contractRows[0]?.c || 0) === 0) {
      await queryInterface.bulkInsert('contracts', [
        {
          id: 1,
          code: 1,
          name: 'Учебный договор на перевозку',
          short_name: 'ДОГ-001/Учебный',
          created_at: now,
          updated_at: now
        }
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    // В учебных целях можно удалить только те записи, что мы добавляли условно по COUNT(*) = 0.
    // Для простоты очищаем таблицы полностью (осторожно в боевой БД!).
    await queryInterface.bulkDelete('contracts', null, {}).catch(() => {});
    await queryInterface.bulkDelete('destination_indications', null, {}).catch(
      () => {}
    );
    await queryInterface.bulkDelete('rolling_stock_types', null, {}).catch(
      () => {}
    );
    await queryInterface.bulkDelete('transport_package_types', null, {}).catch(
      () => {}
    );
    await queryInterface.bulkDelete('cargos', null, {}).catch(() => {});
    await queryInterface.bulkDelete('cargo_groups', null, {}).catch(() => {});
    await queryInterface.bulkDelete('owners_non_public_railway', null, {}).catch(
      () => {}
    );
    await queryInterface.bulkDelete('legal_entities', null, {}).catch(() => {});
    await queryInterface.bulkDelete('stations', null, {}).catch(() => {});
    await queryInterface.bulkDelete('countries', null, {}).catch(() => {});
  }
};

