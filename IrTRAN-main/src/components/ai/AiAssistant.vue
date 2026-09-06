<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  activeAiDocumentContext,
  getActiveAiDocumentContext,
} from "@/composables/useAiDocumentContext";
import { getAiStatus, resetAiSession, streamAiMessage } from "@/helpers/API";

const isOpen = ref(false);
const isExpanded = ref(false);
const isSending = ref(false);
const statusChecked = ref(false);
const serviceAvailable = ref(true);
const input = ref("");
const messages = ref([]);
const messageList = ref(null);
const isAwaitingFirstToken = ref(false);
let activeRequest = null;
let scrollFrame = null;
let scrollVelocity = 0;
let autoScrollEnabled = false;

const documentLabels = {
  transportation_request: "Заявка на грузоперевозку",
  invoice: "Накладная",
  common_act: "Акт общей формы ГУ-23",
  commercial_act: "Коммерческий акт ГУ-22",
  reminder: "Памятка приёмосдатчика",
  filling_statement: "Ведомость подачи и уборки",
  cumulative_statement: "Накопительная ведомость",
};

function createSessionId() {
  const beginnerId = sessionStorage.getItem("irtran-beginner-sid");
  if (beginnerId) return `beginner-${beginnerId}`;
  const key = "irtran-ai-session-id";
  let value = sessionStorage.getItem(key);
  if (!value) {
    const randomPart = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    value = `study-${randomPart}`;
    sessionStorage.setItem(key, value);
  }
  return value;
}

function syncSession() {
  const nextSessionId = createSessionId();
  if (nextSessionId !== sessionId.value) {
    sessionId.value = nextSessionId;
    loadMessages();
  }
}

const sessionId = ref(createSessionId());
const storageKey = computed(() => `irtran-ai-ui-${sessionId.value}`);
const context = computed(() => activeAiDocumentContext.value);
const contextTitle = computed(() => {
  const current = context.value;
  if (!current) return "Общая консультация";
  return current.documentTypeLabel || documentLabels[current.documentType] || current.documentType;
});
const contextSubtitle = computed(() => {
  const current = context.value;
  if (!current) return "Спросите о документах и правилах";
  return current.documentId ? `Документ сохранён · ${current.currentStep}` : `Черновик · ${current.currentStep}`;
});
const quickPrompts = computed(() => context.value
  ? ["Проверь мой документ", "С какого поля лучше продолжить?", "Объясни назначение этого документа"]
  : ["Чем отличаются основные виды накладных?", "Как правильно разбирать ошибку в документе?"]
);

function welcomeMessage() {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    text: context.value
      ? `Я вижу открытую форму «${contextTitle.value}». Могу проверить её логику, объяснить поле или помочь разобрать ошибку — решение останется за вами.`
      : "Я помогу разобраться с железнодорожными документами и правилами тренажёра. Откройте форму, чтобы я учитывал её текущие поля.",
  };
}

function loadMessages() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey.value) || "[]");
    messages.value = Array.isArray(stored) && stored.length
      ? stored.map((message) => ({ ...message, streaming: false, tokens: [] }))
      : [welcomeMessage()];
  } catch (_) {
    messages.value = [welcomeMessage()];
  }
}

function persistMessages() {
  try {
    const stored = messages.value
      .filter((message) => !message.streaming || message.text)
      .slice(-30)
      .map(({ glyphs, tokens, ...message }) => ({ ...message, streaming: false }));
    sessionStorage.setItem(storageKey.value, JSON.stringify(stored));
  } catch (_) {
    // Переполнение sessionStorage не должно ломать чат.
  }
}

async function scrollToLatest() {
  await nextTick();
  scheduleScroll();
}

function runSoftScroll() {
  if (!autoScrollEnabled) {
    scrollFrame = null;
    scrollVelocity = 0;
    return;
  }
  const container = messageList.value;
  if (!container) {
    scrollFrame = null;
    scrollVelocity = 0;
    return;
  }

  const target = Math.max(0, container.scrollHeight - container.clientHeight);
  const distance = target - container.scrollTop;
  if (Math.abs(distance) < 0.45 && Math.abs(scrollVelocity) < 0.08) {
    container.scrollTop = target;
    scrollFrame = null;
    scrollVelocity = 0;
    return;
  }

  // Пружина без перелёта: скорость плавно набирается (ease-in) и гасится
  // возле нижней границы (ease-out). Новый контент лишь двигает цель.
  if (distance * scrollVelocity < 0) scrollVelocity = 0;
  scrollVelocity = (scrollVelocity + distance * 0.022) * 0.82;
  const step = Math.abs(scrollVelocity) > Math.abs(distance) ? distance : scrollVelocity;
  container.scrollTop += step;
  scrollFrame = requestAnimationFrame(runSoftScroll);
}

function scheduleScroll(force = false) {
  if (force) autoScrollEnabled = true;
  if (!autoScrollEnabled) return;
  if (scrollFrame == null) scrollFrame = requestAnimationFrame(runSoftScroll);
}

function stopAutoScroll() {
  autoScrollEnabled = false;
  scrollVelocity = 0;
  if (scrollFrame != null) {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
  }
}

function renderMarkdown(value) {
  return DOMPurify.sanitize(marked.parse(String(value || ""), { breaks: true, gfm: true }));
}

function validationIssueLabel(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "пунктов для проверки";
  if (lastDigit === 1) return "пункт для проверки";
  if (lastDigit >= 2 && lastDigit <= 4) return "пункта для проверки";
  return "пунктов для проверки";
}

async function checkStatus() {
  if (statusChecked.value) return;
  statusChecked.value = true;
  try {
    const status = await getAiStatus();
    serviceAvailable.value = !!status.available;
  } catch (_) {
    serviceAvailable.value = false;
  }
}

async function openAssistant() {
  syncSession();
  isOpen.value = true;
  await checkStatus();
  autoScrollEnabled = true;
  await scrollToLatest();
}

function addMessage(role, text, extra = {}) {
  messages.value.push({ id: `${role}-${Date.now()}-${Math.random()}`, role, text, ...extra });
  persistMessages();
  if (role === "user") autoScrollEnabled = true;
  void scrollToLatest();
}

async function submit(text = input.value) {
  syncSession();
  const message = String(text || "").trim();
  if (!message || isSending.value) return;
  input.value = "";
  addMessage("user", message);
  isSending.value = true;
  isAwaitingFirstToken.value = true;

  // Снимок создаётся после нажатия «Отправить», а не при открытии помощника.
  const current = getActiveAiDocumentContext();
  const requestController = new AbortController();
  activeRequest = requestController;
  let streamedMessage = null;
  let characterIndex = 0;
  let renderFrame = null;
  let pendingChunks = [];
  let streamMetadata = { validationIssues: [], sources: [] };

  const ensureStreamedMessage = () => {
    if (streamedMessage) return streamedMessage;
    messages.value.push({
      id: `assistant-${Date.now()}-${Math.random()}`,
      role: "assistant",
      text: "",
      streaming: true,
      tokens: [],
      issues: streamMetadata.validationIssues,
      sources: streamMetadata.sources,
    });
    streamedMessage = messages.value[messages.value.length - 1];
    return streamedMessage;
  };

  const flushChunks = () => {
    if (renderFrame != null) {
      cancelAnimationFrame(renderFrame);
      renderFrame = null;
    }
    if (!pendingChunks.length) return;

    const chunks = pendingChunks;
    pendingChunks = [];
    const target = ensureStreamedMessage();
    const nextTokens = [];
    for (const chunk of chunks) {
      target.text += chunk;
      for (const part of chunk.split(/(\n)/)) {
        if (!part) continue;
        if (part === "\n") {
          nextTokens.push({ id: `${target.id}-${characterIndex}`, lineBreak: true });
          characterIndex += 1;
          continue;
        }
        const length = Array.from(part).length;
        const midpoint = characterIndex + length / 2;
        // Очень длинная единая волна, привязанная к позиции во всём ответе.
        const waveOffset = 0.42 + Math.sin(midpoint * 0.025) * 0.18;
        nextTokens.push({
          id: `${target.id}-${characterIndex}`,
          text: part,
          waveOffset: `${waveOffset.toFixed(2)}px`,
        });
        characterIndex += length;
      }
    }
    target.tokens.push(...nextTokens);
    scheduleScroll();
  };

  const queueChunk = (chunk) => {
    pendingChunks.push(chunk);
    if (renderFrame == null) renderFrame = requestAnimationFrame(flushChunks);
  };

  try {
    await streamAiMessage(
      {
        message,
        sessionId: sessionId.value,
        source: current?.source || null,
        documentType: current?.documentType || null,
        documentId: current?.documentId || null,
        currentStep: current?.currentStep || "Общая консультация",
        documentContext: current?.payload || {},
      },
      {
        onMeta(metadata) {
          streamMetadata = {
            validationIssues: Array.isArray(metadata.validationIssues) ? metadata.validationIssues : [],
            sources: Array.isArray(metadata.sources) ? metadata.sources : [],
          };
          if (streamedMessage) {
            streamedMessage.issues = streamMetadata.validationIssues;
            streamedMessage.sources = streamMetadata.sources;
          }
          serviceAvailable.value = true;
        },
        onToken(chunk) {
          const value = String(chunk || "");
          if (!value) return;
          isAwaitingFirstToken.value = false;
          queueChunk(value);
        },
        onDone(metadata) {
          streamMetadata = {
            validationIssues: Array.isArray(metadata.validationIssues) ? metadata.validationIssues : streamMetadata.validationIssues,
            sources: Array.isArray(metadata.sources) ? metadata.sources : streamMetadata.sources,
          };
        },
      },
      requestController.signal
    );

    flushChunks();
    if (!streamedMessage?.text.trim()) throw new Error("IrtranAi вернул пустой ответ");
    streamedMessage.issues = streamMetadata.validationIssues;
    streamedMessage.sources = streamMetadata.sources;
    serviceAvailable.value = true;
    streamedMessage.streaming = false;
    streamedMessage.tokens = [];
    persistMessages();
  } catch (error) {
    if (error.name === "AbortError") return;
    flushChunks();
    if (!streamedMessage?.text) {
      if (streamedMessage) {
        messages.value = messages.value.filter((item) => item.id !== streamedMessage.id);
      }
    } else {
      streamedMessage.streaming = false;
      streamedMessage.tokens = [];
    }
    const code = error.response?.data?.error;
    const errorText = error.response?.data?.message
      || (code === "ai_not_configured"
        ? "IrtranAi пока не настроен. Администратору нужно добавить API-ключ провайдера."
        : "Не удалось связаться с ИИ-помощником. Попробуйте ещё раз через минуту.");
    serviceAvailable.value = false;
    addMessage("error", errorText);
  } finally {
    if (renderFrame != null) cancelAnimationFrame(renderFrame);
    // После ответа прокрутка полностью принадлежит пользователю.
    stopAutoScroll();
    if (activeRequest === requestController) {
      activeRequest = null;
      isSending.value = false;
      isAwaitingFirstToken.value = false;
    }
  }
}

async function clearConversation() {
  stopAutoScroll();
  activeRequest?.abort();
  activeRequest = null;
  isSending.value = false;
  isAwaitingFirstToken.value = false;
  try {
    await resetAiSession(sessionId.value);
  } catch (_) {
    // Локальную историю всё равно можно начать заново.
  }
  sessionStorage.removeItem(storageKey.value);
  messages.value = [welcomeMessage()];
  persistMessages();
}

function handleKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void submit();
  }
}

watch(contextTitle, (next, previous) => {
  if (!isOpen.value || !previous || next === previous) return;
  addMessage("assistant", `Контекст обновлён: теперь я вижу форму «${next}».`);
});

onBeforeUnmount(() => {
  activeRequest?.abort();
  stopAutoScroll();
});

loadMessages();
</script>

<template>
  <div class="ai-assistant" :class="{ open: isOpen, expanded: isExpanded }">
    <transition name="assistant-panel">
      <section v-if="isOpen" class="ai-panel" role="dialog" aria-label="ИИ-наставник">
        <header class="ai-header">
          <div class="ai-avatar" aria-hidden="true">
            <font-awesome-icon :icon="['fas', 'robot']" />
          </div>
          <div class="ai-heading">
            <div class="ai-eyebrow">ИИ-наставник</div>
            <div class="ai-title">{{ contextTitle }}</div>
            <div class="ai-context">{{ contextSubtitle }}</div>
          </div>
          <div class="ai-header-actions">
            <button
              class="icon-button expand-button"
              type="button"
              :title="isExpanded ? 'Уменьшить окно' : 'Увеличить окно'"
              :aria-label="isExpanded ? 'Уменьшить окно ИИ-наставника' : 'Увеличить окно ИИ-наставника'"
              :aria-pressed="isExpanded"
              @click="isExpanded = !isExpanded"
            >
              <font-awesome-icon :icon="['fas', isExpanded ? 'compress' : 'expand']" />
            </button>
            <button class="icon-button" type="button" title="Начать новый диалог" @click="clearConversation">
              <font-awesome-icon :icon="['fas', 'rotate-right']" />
            </button>
            <button class="icon-button" type="button" title="Закрыть" @click="isOpen = false">
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
          </div>
        </header>

        <div class="ai-service-state" :class="{ offline: !serviceAvailable }">
          <span class="state-dot" />
          {{ serviceAvailable
            ? `IrtranAi · ${context ? "контекст формы подключён" : "общая консультация"}`
            : "Сервис ожидает настройки или недоступен" }}
        </div>

        <div
          ref="messageList"
          class="ai-messages"
          aria-live="polite"
          @wheel.passive="stopAutoScroll"
          @touchstart.passive="stopAutoScroll"
          @pointerdown="stopAutoScroll"
        >
          <article v-for="message in messages" :key="message.id" class="ai-message" :class="message.role">
            <div class="message-label">
              {{ message.role === "user" ? "Вы" : message.role === "error" ? "Система" : "Наставник" }}
            </div>
            <div v-if="message.streaming" class="message-text stream-text" aria-label="IrtranAi печатает ответ">
              <template v-for="token in message.tokens" :key="token.id">
                <br v-if="token.lineBreak" />
                <span v-else class="stream-token" :style="{ '--wave-offset': token.waveOffset }">{{ token.text }}</span>
              </template>
            </div>
            <div
              v-else-if="message.role === 'assistant'"
              class="message-text message-markdown"
              v-html="renderMarkdown(message.text)"
            />
            <div v-else class="message-text">{{ message.text }}</div>
            <div v-if="message.issues?.length" class="issue-summary">
              <span>{{ message.issues.length }}</span>
              {{ validationIssueLabel(message.issues.length) }}
            </div>
            <div v-if="message.sources?.length" class="message-sources">
              <span>Материалы</span>
              <router-link
                v-for="source in message.sources"
                :key="source.documentId"
                :to="{ name: 'reference', query: { q: source.title || source.filename } }"
                @click="isOpen = false"
              >
                {{ source.title || source.filename }}
              </router-link>
            </div>
          </article>
          <article v-if="isSending && isAwaitingFirstToken" class="ai-message assistant typing" aria-label="Наставник отвечает">
            <span /><span /><span />
          </article>
        </div>

        <div class="quick-prompts">
          <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="submit(prompt)">
            {{ prompt }}
          </button>
        </div>

        <form class="ai-composer" @submit.prevent="submit()">
          <textarea
            v-model="input"
            rows="2"
            maxlength="2000"
            placeholder="Спросите о поле или попросите проверить документ…"
            aria-label="Сообщение ИИ-наставнику"
            @keydown="handleKeydown"
          />
          <button type="submit" :disabled="isSending || !input.trim()" aria-label="Отправить сообщение">
            <font-awesome-icon :icon="['fas', 'arrow-up']" />
          </button>
        </form>
        <div class="ai-disclaimer">Наставник подсказывает ход решения. Итоговую проверку выполняет преподаватель.</div>
      </section>
    </transition>

    <button
      v-if="!isOpen"
      class="ai-launcher"
      type="button"
      aria-label="Открыть ИИ-наставника"
      @click="openAssistant"
    >
      <span class="launcher-glow" />
      <span class="launcher-icon"><font-awesome-icon :icon="['fas', 'robot']" /></span>
      <span class="launcher-copy">
        <strong>ИИ-наставник</strong>
        <small>{{ context ? "Вижу открытую форму" : "Готов помочь" }}</small>
      </span>
    </button>
  </div>
</template>

<style scoped>
.ai-assistant {
  --ai-ink: #172033;
  --ai-muted: #64748b;
  --ai-blue: #356fe5;
  --ai-violet: #7758e8;
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1080;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ai-launcher {
  position: relative;
  min-width: 196px;
  min-height: 62px;
  padding: 10px 16px 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(135deg, #356fe5 0%, #5a64df 50%, #8555dc 100%);
  box-shadow: 0 18px 44px rgba(53, 111, 229, 0.34), inset 0 1px 0 rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.ai-launcher:hover { transform: translateY(-2px); box-shadow: 0 22px 52px rgba(53, 111, 229, 0.42); }
.ai-launcher:focus-visible { outline: 3px solid rgba(53, 111, 229, .25); outline-offset: 4px; }
.launcher-glow { position: absolute; inset: -80% 30% auto -30%; width: 150px; height: 150px; border-radius: 50%; background: rgba(255,255,255,.22); filter: blur(18px); }
.launcher-icon { position: relative; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 15px; display: grid; place-items: center; background: rgba(255,255,255,.18); font-size: 18px; }
.launcher-copy { position: relative; display: grid; text-align: left; line-height: 1.15; }
.launcher-copy strong { font-size: 14px; font-weight: 800; letter-spacing: .01em; }
.launcher-copy small { margin-top: 4px; color: rgba(255,255,255,.78); font-size: 11px; font-weight: 600; }

.ai-panel {
  width: min(410px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 40px));
  border: 1px solid rgba(102, 116, 146, .18);
  border-radius: 26px;
  overflow: hidden;
  background: rgba(250, 252, 255, .97);
  box-shadow: 0 26px 80px rgba(23, 32, 51, .24);
  backdrop-filter: blur(18px);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
  transition: width 320ms cubic-bezier(.4, 0, .2, 1), height 320ms cubic-bezier(.4, 0, .2, 1);
}

.ai-assistant.expanded .ai-panel {
  width: min(760px, calc(100vw - 48px));
  height: min(840px, calc(100vh - 48px));
}

.ai-header { padding: 17px 16px 15px; display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; align-items: center; gap: 11px; background: linear-gradient(145deg, #1f3158 0%, #273f73 52%, #4b3d80 100%); color: white; }
.ai-avatar { width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center; background: linear-gradient(145deg, rgba(255,255,255,.24), rgba(255,255,255,.1)); border: 1px solid rgba(255,255,255,.22); font-size: 18px; }
.ai-heading { min-width: 0; }
.ai-eyebrow { color: #bdcdfa; font-size: 10px; line-height: 1.1; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.ai-title { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; line-height: 1.2; font-weight: 800; }
.ai-context { margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,.67); font-size: 11px; line-height: 1.2; }
.ai-header-actions { display: flex; align-items: center; gap: 5px; }
.icon-button { width: 32px; height: 32px; border: 0; border-radius: 11px; color: rgba(255,255,255,.78); background: rgba(255,255,255,.09); cursor: pointer; }
.icon-button:hover { color: white; background: rgba(255,255,255,.17); }

.ai-service-state { padding: 8px 16px; border-bottom: 1px solid #e8edf6; color: #4a5d7d; background: #fff; display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; }
.state-dot { width: 7px; height: 7px; border-radius: 50%; background: #20b486; box-shadow: 0 0 0 4px rgba(32,180,134,.12); }
.ai-service-state.offline .state-dot { background: #e28a35; box-shadow: 0 0 0 4px rgba(226,138,53,.12); }

.ai-messages { padding: 18px 14px 12px; overflow-y: auto; overflow-anchor: none; background: radial-gradient(circle at 90% 0, rgba(119,88,232,.08), transparent 32%), linear-gradient(180deg, #f7f9fd, #fbfcff); }
.ai-message { width: fit-content; max-width: 88%; margin-bottom: 13px; padding: 11px 13px; border-radius: 16px 16px 16px 5px; color: var(--ai-ink); background: white; border: 1px solid #e7ebf3; box-shadow: 0 7px 20px rgba(24,38,72,.06); }
.ai-message.user { margin-left: auto; border-radius: 16px 16px 5px 16px; color: white; border-color: transparent; background: linear-gradient(135deg, var(--ai-blue), var(--ai-violet)); }
.ai-message.error { color: #8a3b32; background: #fff7f4; border-color: #f2d5ce; }
.message-label { margin-bottom: 3px; color: #71809a; font-size: 9px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.ai-message.user .message-label { color: rgba(255,255,255,.72); }
.message-text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.5; }
.stream-text { white-space: normal; }
.stream-token { display: inline-block; white-space: pre-wrap; animation: ai-token-wave .62s cubic-bezier(.37,0,.63,1) both; will-change: opacity, transform; }
.message-markdown { white-space: normal; }
.message-markdown :deep(h1),
.message-markdown :deep(h2),
.message-markdown :deep(h3),
.message-markdown :deep(h4),
.message-markdown :deep(h5),
.message-markdown :deep(h6) { margin: .8em 0 .38em; line-height: 1.35; font-weight: 800; overflow-wrap: anywhere; }
.message-markdown :deep(h1) { font-size: 16px; }
.message-markdown :deep(h2) { font-size: 15px; }
.message-markdown :deep(h3) { font-size: 14px; }
.message-markdown :deep(h4),
.message-markdown :deep(h5),
.message-markdown :deep(h6) { font-size: 13px; }
.message-markdown :deep(h1:first-child),
.message-markdown :deep(h2:first-child),
.message-markdown :deep(h3:first-child) { margin-top: 0; }
.message-markdown :deep(p) { margin: 0 0 .65em; }
.message-markdown :deep(p:last-child) { margin-bottom: 0; }
.message-markdown :deep(ul), .message-markdown :deep(ol) { margin: .45em 0 .7em; padding-left: 1.4em; }
.message-markdown :deep(li + li) { margin-top: .25em; }
.message-markdown :deep(blockquote) { margin: .65em 0; padding: .25em .75em; border-left: 3px solid #9bb5ec; color: #52627d; background: #f4f7fd; }
.message-markdown :deep(code) { padding: .12em .35em; border-radius: 5px; color: #6d3b78; background: #f2edf8; font: .92em ui-monospace, SFMono-Regular, Consolas, monospace; }
.message-markdown :deep(pre) { margin: .65em 0; padding: .75em; overflow-x: auto; border-radius: 10px; background: #19243a; color: #eef3ff; }
.message-markdown :deep(pre code) { padding: 0; color: inherit; background: transparent; }
.message-markdown :deep(a) { color: #315fc0; text-decoration: underline; text-underline-offset: 2px; }
.message-markdown :deep(table) { width: 100%; margin: .65em 0; border-collapse: collapse; font-size: 11px; }
.message-markdown :deep(th), .message-markdown :deep(td) { padding: 5px 6px; border: 1px solid #dfe5f0; text-align: left; }
.message-markdown :deep(th) { background: #f2f5fb; }
.issue-summary { margin-top: 8px; padding-top: 7px; border-top: 1px solid #e9edf5; color: #596981; font-size: 11px; font-weight: 700; }
.issue-summary span { display: inline-grid; min-width: 20px; height: 20px; margin-right: 3px; place-items: center; border-radius: 7px; color: #7a4b19; background: #fff0cf; }
.message-sources { margin-top: 9px; padding-top: 8px; border-top: 1px solid #e9edf5; display: grid; gap: 5px; }
.message-sources > span { color: #7a879b; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.message-sources a { padding: 0; color: #315fc0; background: transparent; font-size: 11px; font-weight: 700; text-decoration: none; }
.message-sources a:hover { color: #5b45c7; background: transparent; text-decoration: underline; }

.typing { display: flex; align-items: center; gap: 5px; min-width: 58px; min-height: 38px; }
.typing span { width: 6px; height: 6px; border-radius: 50%; background: #7890b5; animation: ai-bounce 1.1s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: .14s; }
.typing span:nth-child(3) { animation-delay: .28s; }
@keyframes ai-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
@keyframes ai-token-wave {
  0% { opacity: .22; transform: translateY(var(--wave-offset, .42px)); }
  100% { opacity: 1; transform: translateY(0); }
}

.quick-prompts { padding: 10px 12px 4px; display: flex; gap: 7px; overflow-x: auto; background: #fff; }
.quick-prompts button { flex: 0 0 auto; padding: 7px 10px; border: 1px solid #dfe6f2; border-radius: 999px; color: #405778; background: #f7f9fd; font-size: 11px; font-weight: 700; cursor: pointer; }
.quick-prompts button:hover { color: #315fc0; border-color: #b9ccef; background: #f0f5ff; }

.ai-composer { margin: 9px 12px 0; padding: 7px 7px 7px 12px; border: 1px solid #dce3ef; border-radius: 17px; background: #fff; display: grid; grid-template-columns: minmax(0, 1fr) 38px; align-items: end; gap: 8px; box-shadow: 0 7px 20px rgba(24,38,72,.06); }
.ai-composer:focus-within { border-color: #91b0ee; box-shadow: 0 0 0 4px rgba(53,111,229,.1); }
.ai-composer textarea { width: 100%; max-height: 110px; resize: none; border: 0; outline: 0; color: var(--ai-ink); background: transparent; font: inherit; font-size: 13px; line-height: 1.4; }
.ai-composer textarea::placeholder { color: #94a0b4; }
.ai-composer button { width: 38px; height: 38px; border: 0; border-radius: 13px; color: white; background: linear-gradient(145deg, var(--ai-blue), var(--ai-violet)); cursor: pointer; box-shadow: 0 7px 16px rgba(53,111,229,.24); }
.ai-composer button:disabled { cursor: default; opacity: .42; box-shadow: none; }
.ai-disclaimer { padding: 8px 14px 12px; color: #8a95a8; background: #fff; text-align: center; font-size: 9px; line-height: 1.35; }

.assistant-panel-enter-active, .assistant-panel-leave-active { transition: opacity 180ms ease, transform 180ms ease; transform-origin: bottom right; }
.assistant-panel-enter-from, .assistant-panel-leave-to { opacity: 0; transform: translateY(12px) scale(.97); }

@media (max-width: 600px) {
  .ai-assistant { right: 12px; bottom: 12px; }
  .ai-panel { width: calc(100vw - 24px); height: min(720px, calc(100vh - 24px)); border-radius: 22px; }
  .ai-assistant.expanded .ai-panel { width: calc(100vw - 24px); height: calc(100vh - 24px); }
  .expand-button { display: none; }
  .ai-launcher { min-width: 62px; width: 62px; padding: 10px; border-radius: 21px; }
  .launcher-copy { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .ai-launcher, .ai-panel, .assistant-panel-enter-active, .assistant-panel-leave-active { transition: none; }
  .typing span, .stream-token { animation: none; }
}
</style>
