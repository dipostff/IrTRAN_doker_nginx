const PREFIX = "irtran-scenario-local:v1:";

export function localProgressKey(docType, docRef) {
  return `${PREFIX}${docType}:${docRef || "draft"}`;
}

export function saveLocalScenarioProgress(docType, docRef, payload) {
  try {
    const key = localProgressKey(docType, docRef);
    localStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function loadLocalScenarioProgress(docType, docRef) {
  try {
    const raw = localStorage.getItem(localProgressKey(docType, docRef));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** После первого сохранения документа переносим черновой ключ прогресса на id */
export function migrateLocalScenarioDraftToId(docType, newId) {
  if (newId == null || newId === "") return;
  try {
    const draft = localStorage.getItem(localProgressKey(docType, "draft"));
    if (!draft) return;
    const idKey = localProgressKey(docType, String(newId));
    if (!localStorage.getItem(idKey)) {
      localStorage.setItem(idKey, draft);
    }
    localStorage.removeItem(localProgressKey(docType, "draft"));
  } catch {
    /* ignore */
  }
}
