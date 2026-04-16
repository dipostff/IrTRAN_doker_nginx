<script setup>
import { onMounted, ref, computed } from 'vue';
import axios from 'axios';
import { getToken } from '@/helpers/keycloak';

const students = ref([]);
const studentsLoading = ref(false);
const studentsError = ref('');
const searchStudent = ref('');

const activeTab = ref('groups'); // groups | students

const groups = ref([]);
const groupsLoading = ref(false);
const groupsError = ref('');
const newGroupName = ref('');
const selectedGroupId = ref('');

const groupMembers = ref([]);
const membersLoading = ref(false);
const membersError = ref('');

const selectedAddStudentId = ref('');
const groupPerformance = ref(null);
const perfLoading = ref(false);
const perfError = ref('');

const trainingProgress = ref(null);
const trainingLoading = ref(false);
const trainingError = ref('');

const trainingDocLabels = {
  transportation: 'Заявка',
  invoice: 'Накладная',
  reminder: 'Памятка',
  common_act: 'Акт (общ.)',
  commercial_act: 'Ком. акт',
  filling_statement: 'Ведомость п/у',
  cumulative_statement: 'Накоп. ведомость',
};

// filters for detail tables
const testDetailFilter = ref({}); // { [testId]: 'all'|'passed'|'failed'|'not_attempted'|'problems' }
const scenarioDetailFilter = ref({}); // { [scenarioId]: 'all'|'viewed'|'not_viewed'|'problems' }

// student profile modal (reuse existing backend endpoint)
const profileModalOpen = ref(false);
const profileLoading = ref(false);
const profileError = ref('');
const profileData = ref(null);

const trainingTableDocKeys = computed(() => {
  const set = new Set();
  for (const st of trainingProgress.value?.students || []) {
    Object.keys(st.progress || {}).forEach((k) => set.add(k));
  }
  return Array.from(set).sort();
});

function formatTrainingDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
}

const filteredStudents = computed(() => {
  const q = searchStudent.value.toLowerCase().trim();
  if (!q) return students.value;
  return students.value.filter((s) => {
    const haystack = [
      s.email || '',
      s.username || '',
      (s.firstName || '') + ' ' + (s.lastName || '')
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
});

const groupsOptions = computed(() => {
  return groups.value || [];
});

const memberIdSet = computed(() => new Set(groupMembers.value.map((m) => m.id)));

const availableStudentsToAdd = computed(() => {
  const set = memberIdSet.value;
  return filteredStudents.value.filter((s) => !set.has(s.id));
});

function baseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

function authHeaders() {
  const token = getToken();
  return { Authorization: token ? `Bearer ${token}` : '' };
}

async function loadStudents() {
  try {
    studentsLoading.value = true;
    studentsError.value = '';
    const response = await axios.get(`${baseUrl()}/api/teacher/students`, {
      headers: authHeaders()
    });
    students.value = response.data || [];
  } catch (e) {
    console.error('Error loading students:', e);
    studentsError.value = 'Не удалось загрузить список студентов.';
  } finally {
    studentsLoading.value = false;
  }
}

async function loadGroups() {
  try {
    groupsLoading.value = true;
    groupsError.value = '';
    const response = await axios.get(`${baseUrl()}/api/teacher/groups`, {
      headers: authHeaders()
    });
    groups.value = response.data || [];
    if (!selectedGroupId.value && groups.value.length) {
      selectedGroupId.value = groups.value[0].id;
      await loadGroupMembers();
      await loadGroupPerformance();
    }
  } catch (e) {
    console.error('Error loading groups:', e);
    groupsError.value = 'Не удалось загрузить список групп.';
  } finally {
    groupsLoading.value = false;
  }
}

async function createGroup() {
  const name = newGroupName.value.trim();
  if (!name) return;
  try {
    groupsLoading.value = true;
    groupsError.value = '';
    const response = await axios.post(
      `${baseUrl()}/api/teacher/groups`,
      { name },
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
    );
    newGroupName.value = '';
    await loadGroups();
    if (response.data?.id) {
      selectedGroupId.value = response.data.id;
      await loadGroupMembers();
      await loadGroupPerformance();
    }
  } catch (e) {
    console.error('Error creating group:', e);
    groupsError.value = e.response?.data?.message || 'Не удалось создать группу.';
  } finally {
    groupsLoading.value = false;
  }
}

async function loadGroupMembers() {
  if (!selectedGroupId.value) return;
  try {
    membersLoading.value = true;
    membersError.value = '';
    const response = await axios.get(
      `${baseUrl()}/api/teacher/groups/${selectedGroupId.value}/members`,
      { headers: authHeaders() }
    );
    groupMembers.value = response.data || [];
  } catch (e) {
    console.error('Error loading group members:', e);
    membersError.value = 'Не удалось загрузить участников группы.';
  } finally {
    membersLoading.value = false;
  }
}

async function addMember() {
  if (!selectedGroupId.value || !selectedAddStudentId.value) return;
  try {
    membersLoading.value = true;
    membersError.value = '';
    await axios.post(
      `${baseUrl()}/api/teacher/groups/${selectedGroupId.value}/members`,
      { studentIds: [selectedAddStudentId.value] },
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
    );
    selectedAddStudentId.value = '';
    await loadGroupMembers();
    await loadGroupPerformance();
  } catch (e) {
    console.error('Error adding member:', e);
    membersError.value = e.response?.data?.message || 'Не удалось добавить участника.';
  } finally {
    membersLoading.value = false;
  }
}

async function removeMember(member) {
  if (!selectedGroupId.value || !member?.id) return;
  if (!window.confirm('Удалить студента из группы?')) return;
  try {
    membersLoading.value = true;
    membersError.value = '';
    await axios.delete(
      `${baseUrl()}/api/teacher/groups/${selectedGroupId.value}/members/${member.id}`,
      { headers: authHeaders() }
    );
    await loadGroupMembers();
    await loadGroupPerformance();
  } catch (e) {
    console.error('Error removing member:', e);
    membersError.value = e.response?.data?.message || 'Не удалось удалить участника.';
  } finally {
    membersLoading.value = false;
  }
}

async function loadGroupPerformance() {
  if (!selectedGroupId.value) return;
  try {
    perfLoading.value = true;
    perfError.value = '';
    const response = await axios.get(
      `${baseUrl()}/api/teacher/groups/${selectedGroupId.value}/performance`,
      { headers: authHeaders() }
    );
    groupPerformance.value = response.data || null;
    // initialize filters for new data
    const tests = groupPerformance.value?.tests || [];
    const scenarios = groupPerformance.value?.scenarios || [];
    tests.forEach((t) => {
      if (!testDetailFilter.value[t.testId]) testDetailFilter.value[t.testId] = 'all';
    });
    scenarios.forEach((sc) => {
      if (!scenarioDetailFilter.value[sc.scenarioId]) scenarioDetailFilter.value[sc.scenarioId] = 'all';
    });
  } catch (e) {
    console.error('Error loading group performance:', e);
    perfError.value = 'Не удалось загрузить успеваемость группы.';
    groupPerformance.value = null;
  } finally {
    perfLoading.value = false;
  }
  loadTrainingScenarioProgress();
}

async function loadTrainingScenarioProgress() {
  if (!selectedGroupId.value) {
    trainingProgress.value = null;
    return;
  }
  try {
    trainingLoading.value = true;
    trainingError.value = '';
    const response = await axios.get(
      `${baseUrl()}/api/teacher/groups/${selectedGroupId.value}/training-scenario-progress`,
      { headers: authHeaders() }
    );
    trainingProgress.value = response.data || null;
  } catch (e) {
    console.error('Error loading training scenario progress:', e);
    trainingError.value = 'Не удалось загрузить прогресс тренажёра.';
    trainingProgress.value = null;
  } finally {
    trainingLoading.value = false;
  }
}

function memberDisplayName(m) {
  const full = `${m.lastName || ''} ${m.firstName || ''}`.trim();
  return full || m.username || m.email || m.id;
}

function filteredTestStudents(testItem) {
  const f = testDetailFilter.value?.[testItem.testId] || 'all';
  const list = testItem.students || [];
  if (f === 'all') return list;
  if (f === 'problems') return list.filter((s) => s.status === 'failed' || s.status === 'not_attempted');
  return list.filter((s) => s.status === f);
}

function filteredScenarioStudents(scItem) {
  const f = scenarioDetailFilter.value?.[scItem.scenarioId] || 'all';
  const list = scItem.students || [];
  if (f === 'all') return list;
  if (f === 'viewed') return list.filter((s) => !!s.viewed);
  if (f === 'not_viewed') return list.filter((s) => !s.viewed);
  if (f === 'problems') return list.filter((s) => !s.viewed);
  return list;
}

async function openStudentProfile(userId) {
  if (!userId) return;
  try {
    profileModalOpen.value = true;
    profileLoading.value = true;
    profileError.value = '';
    profileData.value = null;
    const response = await axios.get(`${baseUrl()}/api/teacher/students/${userId}/profile`, {
      headers: authHeaders()
    });
    profileData.value = response.data || null;
  } catch (e) {
    console.error('Error loading student profile:', e);
    profileError.value = e.response?.data?.message || 'Не удалось загрузить профиль студента.';
  } finally {
    profileLoading.value = false;
  }
}

function closeStudentProfile() {
  profileModalOpen.value = false;
  profileData.value = null;
  profileError.value = '';
}

async function deleteSelectedGroup() {
  if (!selectedGroupId.value) return;
  if (!window.confirm('Удалить группу? Это удалит группу в Keycloak и её состав.')) return;
  try {
    groupsLoading.value = true;
    groupsError.value = '';
    await axios.delete(`${baseUrl()}/api/teacher/groups/${selectedGroupId.value}`, {
      headers: authHeaders()
    });
    selectedGroupId.value = '';
    groupMembers.value = [];
    groupPerformance.value = null;
    trainingProgress.value = null;
    await loadGroups();
  } catch (e) {
    console.error('Error deleting group:', e);
    groupsError.value = e.response?.data?.message || 'Не удалось удалить группу.';
  } finally {
    groupsLoading.value = false;
  }
}

onMounted(() => {
  loadStudents();
  loadGroups();
});
</script>

<template>
  <div>
    <h4 class="mb-3">Панель преподавателя</h4>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'groups' }"
          @click="activeTab = 'groups'"
        >
          Группы
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'students' }"
          @click="activeTab = 'students'"
        >
          Студенты
        </button>
      </li>
    </ul>

    <div v-if="activeTab === 'groups'">
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <label class="form-label">Выберите группу</label>
          <select
            v-model="selectedGroupId"
            class="form-select"
            @change="loadGroupMembers(); loadGroupPerformance();"
          >
            <option value="">—</option>
            <option v-for="g in groupsOptions" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
          <div v-if="groupsLoading" class="text-muted mt-2">Загрузка групп...</div>
          <div v-if="groupsError" class="text-danger mt-2">{{ groupsError }}</div>
          <button
            v-if="selectedGroupId"
            type="button"
            class="btn btn-outline-danger mt-2"
            :disabled="groupsLoading"
            @click="deleteSelectedGroup"
          >
            Удалить группу
          </button>
        </div>

        <div class="col-md-6">
          <label class="form-label">Создать группу</label>
          <div class="input-group">
            <input v-model="newGroupName" type="text" class="form-control" placeholder="Например: ИВТ-21" />
            <button class="btn btn-primary" type="button" :disabled="groupsLoading || !newGroupName.trim()" @click="createGroup">
              Создать
            </button>
          </div>
          <div class="form-text">
            Группы создаются в Keycloak и привязываются к преподавателю.
          </div>
        </div>
      </div>

      <div v-if="selectedGroupId" class="row g-3">
        <div class="col-lg-4">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title mb-3">Участники группы</h6>

              <div class="mb-2">
                <label class="form-label">Поиск студента (email/ФИО/логин)</label>
                <input v-model="searchStudent" type="text" class="form-control" placeholder="Введите часть..." />
              </div>

              <div class="mb-3">
                <label class="form-label">Добавить в группу</label>
                <div class="input-group">
                  <select v-model="selectedAddStudentId" class="form-select">
                    <option value="">—</option>
                    <option v-for="s in availableStudentsToAdd" :key="s.id" :value="s.id">
                      {{ (s.lastName || '') + ' ' + (s.firstName || '') || s.username }} ({{ s.email }})
                    </option>
                  </select>
                  <button class="btn btn-outline-primary" type="button" :disabled="membersLoading || !selectedAddStudentId" @click="addMember">
                    Добавить
                  </button>
                </div>
              </div>

              <div v-if="membersLoading" class="text-muted">Загрузка/обновление...</div>
              <div v-if="membersError" class="text-danger mb-2">{{ membersError }}</div>

              <div class="list-group">
                <div v-if="!groupMembers.length" class="text-muted">Участников нет.</div>
                <div
                  v-for="m in groupMembers"
                  :key="m.id"
                  class="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div class="fw-semibold">{{ memberDisplayName(m) }}</div>
                    <div class="text-muted small">{{ m.email || m.username }}</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeMember(m)">
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title mb-2">Успеваемость по тестам</h6>
              <div v-if="perfLoading" class="text-muted">Загрузка успеваемости...</div>
              <div v-if="perfError" class="text-danger">{{ perfError }}</div>

              <div v-if="groupPerformance && groupPerformance.tests">
                <div v-for="t in groupPerformance.tests" :key="t.testId" class="mb-3">
                  <details>
                    <summary class="d-flex justify-content-between align-items-center">
                      <div>
                        <span class="fw-semibold">{{ t.title }}</span>
                        <span v-if="t.passPercent != null" class="text-muted ms-2">порог: {{ t.passPercent }}%</span>
                      </div>
                      <div class="text-muted small">
                        попытки: {{ t.summary.attempted }}/{{ t.summary.membersTotal }},
                        прошли: {{ t.summary.passed }},
                        не прошли: {{ t.summary.failed }},
                        не проходили: {{ t.summary.notAttempted }},
                        avg%: {{ t.summary.avgBestPercent }}
                      </div>
                    </summary>
                    <div class="table-responsive mt-2">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="text-muted small">Фильтр:</span>
                        <select v-model="testDetailFilter[t.testId]" class="form-select form-select-sm" style="width: auto;">
                          <option value="all">Все</option>
                          <option value="problems">Проблемные</option>
                          <option value="passed">Прошли</option>
                          <option value="failed">Не прошли</option>
                          <option value="not_attempted">Не проходили</option>
                        </select>
                        <span class="badge bg-success">Прошли: {{ t.summary.passed }}</span>
                        <span class="badge bg-danger">Не прошли: {{ t.summary.failed }}</span>
                        <span class="badge bg-secondary">Не проходили: {{ t.summary.notAttempted }}</span>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary ms-auto"
                          @click="testDetailFilter[t.testId] = 'problems'"
                        >
                          Показать проблемных
                        </button>
                      </div>
                      <table class="table table-sm table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Студент</th>
                            <th>Статус</th>
                            <th>Попыток</th>
                            <th>Лучший %</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="s in filteredTestStudents(t)" :key="s.userId">
                            <td>{{ memberDisplayName(s) }}</td>
                            <td>
                              <span v-if="s.status === 'passed'" class="badge bg-success">Прошел</span>
                              <span v-else-if="s.status === 'failed'" class="badge bg-danger">Не прошел</span>
                              <span v-else class="badge bg-secondary">Не проходил</span>
                            </td>
                            <td>{{ s.attempts }}</td>
                            <td>
                              <span v-if="s.bestPercent != null">{{ Number(s.bestPercent).toFixed(1) }}%</span>
                              <span v-else>—</span>
                            </td>
                            <td class="text-end">
                              <button type="button" class="btn btn-sm btn-outline-primary" @click="openStudentProfile(s.userId)">
                                Профиль
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h6 class="card-title mb-2">Ознакомление со сценариями</h6>
              <div v-if="groupPerformance && groupPerformance.scenarios">
                <div v-for="sc in groupPerformance.scenarios" :key="sc.scenarioId" class="mb-3">
                  <details>
                    <summary class="d-flex justify-content-between align-items-center">
                      <div class="fw-semibold">{{ sc.title }}</div>
                      <div class="text-muted small">
                        ознакомились: {{ sc.summary.viewed }}/{{ sc.summary.membersTotal }}
                        ({{ sc.summary.viewedPercent }}%)
                      </div>
                    </summary>
                    <div class="table-responsive mt-2">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="text-muted small">Фильтр:</span>
                        <select v-model="scenarioDetailFilter[sc.scenarioId]" class="form-select form-select-sm" style="width: auto;">
                          <option value="all">Все</option>
                          <option value="problems">Проблемные</option>
                          <option value="viewed">Ознакомились</option>
                          <option value="not_viewed">Не ознакомились</option>
                        </select>
                        <span class="badge bg-success">Ознакомились: {{ sc.summary.viewed }}</span>
                        <span class="badge bg-secondary">Не ознакомились: {{ sc.summary.notViewed }}</span>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary ms-auto"
                          @click="scenarioDetailFilter[sc.scenarioId] = 'problems'"
                        >
                          Показать проблемных
                        </button>
                      </div>
                      <table class="table table-sm table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Студент</th>
                            <th>Статус</th>
                            <th>Первый просмотр</th>
                            <th>Последний просмотр</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="s in filteredScenarioStudents(sc)" :key="s.userId">
                            <td>{{ memberDisplayName(s) }}</td>
                            <td>
                              <span v-if="s.viewed" class="badge bg-success">Ознакомился</span>
                              <span v-else class="badge bg-secondary">Не ознакомился</span>
                            </td>
                            <td>
                              <span v-if="s.firstViewedAt">{{ new Date(s.firstViewedAt).toLocaleString() }}</span>
                              <span v-else>—</span>
                            </td>
                            <td>
                              <span v-if="s.lastViewedAt">{{ new Date(s.lastViewedAt).toLocaleString() }}</span>
                              <span v-else>—</span>
                            </td>
                            <td class="text-end">
                              <button type="button" class="btn btn-sm btn-outline-primary" @click="openStudentProfile(s.userId)">
                                Профиль
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title mb-2">Тренажёр документов (прогресс сценария)</h6>
              <p class="text-muted small mb-2">
                Данные приходят с клиента при работе студента в режиме «Новичок»/«Продвинутый» (с задержкой ~2 с).
              </p>
              <div v-if="trainingLoading" class="text-muted">Загрузка прогресса...</div>
              <div v-if="trainingError" class="text-danger">{{ trainingError }}</div>
              <div
                v-if="trainingProgress && trainingProgress.students && trainingProgress.students.length && trainingTableDocKeys.length"
                class="table-responsive"
              >
                <table class="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Студент</th>
                      <th v-for="dk in trainingTableDocKeys" :key="dk">{{ trainingDocLabels[dk] || dk }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="st in trainingProgress.students" :key="st.userId">
                      <td>{{ memberDisplayName(st) }}</td>
                      <td v-for="dk in trainingTableDocKeys" :key="`${st.userId}-${dk}`">
                        <template v-if="st.progress && st.progress[dk]">
                          <span class="fw-semibold">{{ st.progress[dk].percent }}%</span>
                          <span class="text-muted small">
                            ({{ st.progress[dk].doneCount }}/{{ st.progress[dk].totalCount }})
                          </span>
                          <div class="text-muted small">{{ formatTrainingDate(st.progress[dk].updatedAt) }}</div>
                        </template>
                        <template v-else>—</template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div
                v-else-if="trainingProgress && trainingProgress.students && trainingProgress.students.length && !trainingLoading"
                class="text-muted small"
              >
                Пока нет сохранённых снимков прогресса по типам документов.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'students'">
      <div class="mb-2 text-muted">
        Список студентов используется для добавления в группы. Детальный профиль можно вернуть как отдельный экран при необходимости.
      </div>
      <div class="row mb-3">
        <div class="col-md-6">
          <label class="form-label">Поиск по email / ФИО / логину</label>
          <input v-model="searchStudent" type="text" class="form-control" placeholder="Введите email или часть имени..." />
        </div>
      </div>
      <div v-if="studentsLoading">Загрузка студентов...</div>
      <div v-if="studentsError" class="text-danger mb-2">{{ studentsError }}</div>
      <div class="table-responsive">
        <table class="table table-sm table-striped align-middle">
          <thead>
            <tr>
              <th>ФИО/логин</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStudents" :key="s.id">
              <td>{{ (s.lastName || '') + ' ' + (s.firstName || '') || s.username }}</td>
              <td>{{ s.email }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Student profile modal -->
    <div v-if="profileModalOpen" class="modal-backdrop fade show"></div>
    <div v-if="profileModalOpen" class="modal fade show" style="display: block;" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div class="modal-content">
          <div class="modal-header" style="background-color: #7da5f0; color: white;">
            <h5 class="modal-title">Профиль студента</h5>
            <button type="button" class="btn-close btn-close-white" aria-label="Close" @click="closeStudentProfile"></button>
          </div>
          <div class="modal-body">
            <div v-if="profileLoading" class="text-muted">Загрузка профиля...</div>
            <div v-if="profileError" class="alert alert-danger">{{ profileError }}</div>
            <div v-if="profileData">
              <div class="mb-3">
                <div class="fw-bold">
                  {{ (profileData.user.lastName || '') + ' ' + (profileData.user.firstName || '') || profileData.user.username }}
                </div>
                <div class="text-muted">{{ profileData.user.email }}</div>
              </div>

              <h6>Тесты</h6>
              <div class="table-responsive mb-3">
                <table class="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Тест</th>
                      <th>Попыток</th>
                      <th>Лучший %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in profileData.tests" :key="t.testId">
                      <td>{{ t.title }}</td>
                      <td>{{ t.attemptsCount }}</td>
                      <td>{{ (Number(t.bestPercent) || 0).toFixed(1) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h6>Сценарии</h6>
              <div class="table-responsive">
                <table class="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Сценарий</th>
                      <th>Статус</th>
                      <th>Первый просмотр</th>
                      <th>Последний просмотр</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sc in profileData.scenarios" :key="sc.scenarioId">
                      <td>{{ sc.title }}</td>
                      <td>
                        <span v-if="sc.viewed" class="badge bg-success">Ознакомился</span>
                        <span v-else class="badge bg-secondary">Не ознакомился</span>
                      </td>
                      <td>
                        <span v-if="sc.firstViewedAt">{{ new Date(sc.firstViewedAt).toLocaleString() }}</span>
                        <span v-else>—</span>
                      </td>
                      <td>
                        <span v-if="sc.lastViewedAt">{{ new Date(sc.lastViewedAt).toLocaleString() }}</span>
                        <span v-else>—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeStudentProfile">Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

