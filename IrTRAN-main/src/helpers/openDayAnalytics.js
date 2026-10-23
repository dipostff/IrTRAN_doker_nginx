const RUN_KEY = 'openDayClientRunId';
const START_TS_KEY = 'openDayStartedAt';

function apiBase() {
  return (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateClientRunId() {
  try {
    let id = sessionStorage.getItem(RUN_KEY);
    if (!id) {
      id = newId();
      sessionStorage.setItem(RUN_KEY, id);
    }
    return id;
  } catch {
    return newId();
  }
}

export function resetClientRunId() {
  const id = newId();
  try {
    sessionStorage.setItem(RUN_KEY, id);
    sessionStorage.setItem(START_TS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  return id;
}

async function postEvent(payload) {
  try {
    const res = await fetch(`${apiBase()}/api/open-day/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('open-day analytics failed', res.status);
      return null;
    }
    return res.json().catch(() => ({ ok: true }));
  } catch (e) {
    console.warn('open-day analytics network error', e);
    return null;
  }
}

/** Старт теста: новый client_run_id на каждое прохождение. */
export async function trackOpenDayStart() {
  const client_run_id = resetClientRunId();
  await postEvent({ event: 'start', client_run_id });
  return client_run_id;
}

/** Финиш: результат без персональных данных. */
export async function trackOpenDayFinish({ top, second, low, isClose, percent, questionIds }) {
  let client_run_id;
  try {
    client_run_id = sessionStorage.getItem(RUN_KEY) || getOrCreateClientRunId();
  } catch {
    client_run_id = getOrCreateClientRunId();
  }

  let duration_sec = null;
  try {
    const started = Number(sessionStorage.getItem(START_TS_KEY));
    if (started) duration_sec = Math.round((Date.now() - started) / 1000);
  } catch {
    /* ignore */
  }

  return postEvent({
    event: 'finish',
    client_run_id,
    top,
    second,
    low,
    is_close: !!isClose,
    percent,
    question_ids: questionIds,
    duration_sec,
  });
}
