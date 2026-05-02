/**
 * Клиентский разбор и пакеты для импорта справочников без 504 от внешнего LB.
 */

export const DICTIONARY_IMPORT_CHUNK_SIZE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_DICTIONARY_IMPORT_CHUNK
    ? parseInt(import.meta.env.VITE_DICTIONARY_IMPORT_CHUNK, 10) || 900
    : 900;

export function chunkRows(arr, chunkSize) {
  const size = Math.max(1, chunkSize || 900);
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function transformStationsNodesMapJson(data) {
  if (!data || typeof data !== 'object' || !data.stations || typeof data.stations !== 'object') {
    return null;
  }
  const stationNames = Object.keys(data.stations || {});
  return stationNames.map((name) => ({
    name,
    railway: data.railway?.[name] ?? '',
    code: data.station_code?.[name] ?? '',
    short_name: data.short_name?.[name] ?? '',
    paragraph: data.station_paragraphs?.[name] ?? ''
  }));
}

/**
 * То же содержание, что parseJsonRows на сервере (без файла-буфера).
 */
export function parseDictionaryJsonFromText(text, dictKey) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    const err = new Error('invalid_json');
    err.statusCode = 400;
    throw err;
  }

  if (dictKey === 'stations') {
    const transformed = transformStationsNodesMapJson(data);
    if (Array.isArray(transformed)) return transformed;
  }

  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) return data.items;
    const firstArray = Object.values(data).find((v) => Array.isArray(v));
    if (Array.isArray(firstArray)) return firstArray;
  }

  const err = new Error('unsupported_json_shape');
  err.statusCode = 400;
  throw err;
}

export async function parseDictionaryXlsxFile(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  if (!wb.SheetNames?.length) {
    const err = new Error('xlsx_no_sheets');
    err.statusCode = 400;
    throw err;
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
}

export function aggregateImportBatchStats(acc, stats) {
  if (!stats) return acc;
  return {
    total: (acc.total || 0) + (stats.total || 0),
    inserted: (acc.inserted || 0) + (stats.inserted || 0),
    updated: (acc.updated || 0) + (stats.updated || 0),
    skipped: (acc.skipped || 0) + (stats.skipped || 0)
  };
}
