import { onScopeDispose, readonly, shallowRef, unref, watchEffect } from "vue";

const activeContext = shallowRef(null);
let activeOwner = null;
let activeSnapshot = null;

function safeClone(value) {
  if (!value || typeof value !== "object") return {};
  try {
    // Vue передаёт сюда Proxy: structuredClone(proxy) выбрасывает DataCloneError.
    // JSON-клонирование одновременно снимает Proxy и читает вложенные поля для watchEffect.
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return {};
  }
}

function optionValue(value) {
  if (typeof value === "function") return value();
  return unref(value);
}

/**
 * Публикует актуальное состояние открытой формы для глобального ИИ-помощника.
 * Сохранённый documentId берётся только из серверного id, локальный id остаётся внутри payload.
 */
export function useAiDocumentContext(documentType, documentRef, options = {}) {
  const owner = Symbol(documentType);
  activeOwner = owner;

  const publish = () => {
    const sourceValue = options.getPayload
      ? optionValue(options.getPayload)
      : unref(documentRef);
    const payload = safeClone(sourceValue);
    const source = options.source || "student";
    const rawServerId = source === "transportation" ? payload.id : payload.backendId;
    const numericServerId = rawServerId == null || rawServerId === "" ? null : Number(rawServerId);

    activeContext.value = {
      documentType,
      documentTypeLabel: options.label || null,
      source,
      documentId: Number.isSafeInteger(numericServerId) && numericServerId > 0 ? numericServerId : null,
      currentStep: optionValue(options.currentStep) || "Заполнение документа",
      payload,
    };
    return activeContext.value;
  };

  activeSnapshot = publish;
  const stop = watchEffect(publish);

  onScopeDispose(() => {
    stop();
    if (activeOwner === owner) {
      activeOwner = null;
      activeSnapshot = null;
      activeContext.value = null;
    }
  });
}

/** Возвращает снимок формы, сделанный в момент отправки сообщения. */
export function getActiveAiDocumentContext() {
  return activeSnapshot ? activeSnapshot() : null;
}

export const activeAiDocumentContext = readonly(activeContext);
