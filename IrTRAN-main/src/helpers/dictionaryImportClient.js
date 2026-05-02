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

/**
 * Как на сервере: первая строка — заголовки, дальше значения (на случай, когда
 * sheet_to_json не строит ключи из заголовков из-за формата первой строки).
 */
function sheetMatrixToRowObjects(matrix) {
  if (!matrix || matrix.length < 2) return [];
  const headers = (matrix[0] || []).map((h) => String(h ?? '').trim());
  const result = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const raw = matrix[i] || [];
    const rowObj = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const value = raw[idx];
      if (value === undefined || value === null || value === '') return;
      rowObj[h] = typeof value === 'string' ? value.trim() : value;
    });
    if (Object.keys(rowObj).length > 0) result.push(rowObj);
  }
  return result;
}

function parseOneSheetToObjects(XLSX, ws) {
  if (!ws) return [];
  const auto = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  const nonEmptyRows = auto.filter(
    (row) => row && typeof row === 'object' && Object.keys(row).length > 0
  );
  if (nonEmptyRows.length > 0) return nonEmptyRows;
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return sheetMatrixToRowObjects(matrix);
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
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = parseOneSheetToObjects(XLSX, ws);
    if (rows.length > 0) return rows;
  }
  return [];
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
