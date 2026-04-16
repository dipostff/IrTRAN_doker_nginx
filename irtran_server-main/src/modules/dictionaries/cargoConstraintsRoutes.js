//-----------Подключаемые модули-----------//
const express = require('express');
const keycloakAuth = require('./../auth/keycloakAuth');
const sequelize = require('./../sequelize/db');
//-----------Подключаемые модули-----------//

const router = express.Router();

async function getKnotKeyForStation(stationId) {
  const id = parseInt(stationId, 10);
  if (Number.isNaN(id)) return null;

  const [rows] = await sequelize.query(
    'SELECT knot FROM stations WHERE id = :id LIMIT 1',
    { replacements: { id } }
  );
  const station = Array.isArray(rows) ? rows[0] : null;
  const knotKey = station && station.knot;
  return knotKey || null;
}

async function loadAllowedCargoGroupIdsByKnot(knotKey) {
  if (!knotKey) return [];
  const [rows] = await sequelize.query(
    'SELECT id_cargo_group AS id FROM knot_cargo_groups WHERE knot_key = :knotKey',
    { replacements: { knotKey } }
  );
  return rows.map((r) => Number(r.id)).filter((x) => !Number.isNaN(x));
}

async function loadAllowedCargoIdsByKnot(knotKey) {
  if (!knotKey) return [];
  const [rows] = await sequelize.query(
    'SELECT id_cargo AS id FROM knot_cargos WHERE knot_key = :knotKey',
    { replacements: { knotKey } }
  );
  return rows.map((r) => Number(r.id)).filter((x) => !Number.isNaN(x));
}

function registerCargoConstraintsRoutes(app) {
  router.get(
    '/api/cargo-constraints',
    keycloakAuth.verifyToken(),
    async (req, res) => {
      try {
        const stationId = req.query.stationId;
        const knotKeyQuery = req.query.knotKey;

        const knotKey =
          knotKeyQuery && String(knotKeyQuery).trim()
            ? String(knotKeyQuery).trim()
            : await getKnotKeyForStation(stationId);

        if (!knotKey) {
          return res.json({
            knotKey: null,
            hasGroupRestrictions: false,
            hasCargoRestrictions: false,
            cargoGroupIds: [],
            cargoIds: []
          });
        }

        const [cargoGroupIds, cargoIds] = await Promise.all([
          loadAllowedCargoGroupIdsByKnot(knotKey),
          loadAllowedCargoIdsByKnot(knotKey)
        ]);

        const hasGroupRestrictions = cargoGroupIds.length > 0;
        const hasCargoRestrictions = cargoIds.length > 0;

        return res.json({
          knotKey,
          hasGroupRestrictions,
          hasCargoRestrictions,
          cargoGroupIds,
          cargoIds
        });
      } catch (e) {
        console.error('Error loading cargo constraints:', e);
        return res.status(500).json({
          error: 'cargo_constraints_failed',
          message: 'Не удалось загрузить ограничения по грузам.'
        });
      }
    }
  );

  app.use(router);
}

module.exports = { registerCargoConstraintsRoutes };

