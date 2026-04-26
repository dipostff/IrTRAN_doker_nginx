import axios from "axios";
import { useListsStore } from "@/stores/main";
import { getToken, updateToken } from "./keycloak";

const runtimeOrigin =
    typeof window !== "undefined" && window.location && window.location.origin
        ? window.location.origin
        : "";
const baseUrl = (import.meta.env.VITE_API_URL || runtimeOrigin).replace(/\/$/, "");
const host = baseUrl.replace(/^https?:\/\//, ""); // имя или ip хоста api для sendRequest
const listsStore = useListsStore();

// Create axios instance with interceptor for adding token
const apiClient = axios.create();

// Request interceptor to add token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Update token if needed
      await updateToken(30);
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error updating token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//-----------------Авторизация----------------------

export async function authorization(login, password) {
    // Keycloak handles authentication, this function is kept for compatibility
    // but should not be used directly. Use login() from keycloak.js instead.
    return "successfully";
}

//--------------------------------------------------

//-----------------Геттеры--------------------------

export async function getDocumentTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/document_types', request);

    listsStore.document_types = processingArray(response);
}

export async function getMessageTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/message_types', request);

    listsStore.message_types = processingArray(response);
}

export async function getSignsSending() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/signs_sending', request);

    listsStore.signs_sending = processingArray(response);
}

export async function getCountries() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/countries', request);

    listsStore.countries = processingArray(response);
}

export async function getLegalEntities() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/legal_entities', request);

    listsStore.legal_entities = processingArray(response);
}

export async function getOwnerships() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/ownerships', request);

    listsStore.ownerships = processingArray(response);
}

export async function getOwnersNonPublicRailway() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/owners_non_public_railway', request);

    listsStore.owners_non_public_railway = processingArray(response);
}

export async function getApprovalsWithOwner() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/approvals_with_owner', request);

    listsStore.approvals_with_owner = processingArray(response);
}

export async function getCargoGroups() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/cargo_groups', request);

    listsStore.cargo_groups = processingArray(response);
}

export async function getMethodsSubmission() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/methods_submission', request);

    listsStore.methods_submission = processingArray(response);
}

export async function getStations() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/stations', request);

    listsStore.stations = processingArray(response);
}

export async function getSendings() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/sending', request);

    listsStore.sendings = processingArray(response);
}

export async function getCargos() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/cargo', request);

    listsStore.cargos = processingArray(response);
}

export async function getTransportPackageTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/transport_package_types', request);

    listsStore.transport_package_types = processingArray(response);
}

export async function getRollingStockTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/rolling_stock_types', request);

    listsStore.rolling_stock_types = processingArray(response);
}

export async function getContracts() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/contracts', request);

    listsStore.contracts = processingArray(response);
}

export async function getDestinationIndications() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/destination_indications', request);

    listsStore.destination_indications = processingArray(response);
}

export async function getSubmissionSchedules() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/submission_schedules', request);

    listsStore.submission_schedules = processingArray(response);
}

export async function getSendNumbers() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/send_numbers', request);

    listsStore.send_numbers = processingArray(response);
}

export async function getPayers() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/payers', request);

    listsStore.payers = processingArray(response);
}

export async function getPayerTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/payer_types', request);

    listsStore.payer_types = processingArray(response);
}

// Ограничения допустимых грузов/групп по узлу/станции.
// backend: GET /api/cargo-constraints?stationId=...|knotKey=...
export async function getCargoConstraints({ stationId, knotKey } = {}) {
    const params = {};
    if (stationId) params.stationId = stationId;
    if (knotKey) params.knotKey = knotKey;

    try {
        const response = await apiClient.get(`${baseUrl}/api/cargo-constraints`, { params });
        return response.data;
    } catch (e) {
        console.error('Failed to load cargo constraints:', e);
        return {
            knotKey: null,
            hasGroupRestrictions: false,
            hasCargoRestrictions: false,
            cargoGroupIds: [],
            cargoIds: []
        };
    }
}

export async function getSendTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/send_types', request);

    listsStore.send_types = processingArray(response);
}

export async function getSpeedTypes() {
    let request = {
        "act": "read",
        "selection_type": "all"
    };

    let response = await sendRequest(baseUrl + '/speed_types', request);

    listsStore.speed_types = processingArray(response);
}

export async function getTransportations() {
    try {
        const response = await apiClient.get(baseUrl + '/api/requests_transportation');
        const data = Array.isArray(response.data) ? response.data : [];
        listsStore.transportations = processingArray(data);
    } catch (e) {
        if (e.response?.status === 401) throw e;
        listsStore.transportations = {};
    }
}

export async function getTransportation(id) {
    let request = {
        "act": "read",
        "selection_type": "one",
        "object": {
            "id": id
        }
    };

    let response = await sendRequest(baseUrl + '/requests_transportation', request);
    
    if (!response || response.error) {
        return response;
    }
    
    ['approval_with_owner_date', 'registration_date', 'transportation_date_from', 'transportation_date_to', 'created_at'].forEach((item) => {
        if (response && Object.prototype.hasOwnProperty.call(response, item)) {
        response[item] = convertDate(response[item]);
        }
    });

    return response;
}

export async function getSending(id) {
    let request = {
        "act": "read",
        "selection_type": "one",
        "object": {
            "id": id
        }
    };

    let response = await sendRequest(baseUrl + '/sending', request);

    return response;
}

//--------------------------------------------------

//------------------Сохранение----------------------

export async function saveTransporation(object) {
    let act = object.id ? 'update' : 'create';

    let request = {
        "act": act,
        "object": object
    };

    let response = await sendRequest(baseUrl + '/requests_transportation', request);

    console.log('API response', response);

    if (!response || response.error) {
        return response;
    }

    return getTransportation(response.id);
}

export async function saveSending(object) {
    let act = object.id ? 'update' : 'create';

    let request = {
        "act": act,
        "object": object
    };
    
    let response = await sendRequest(baseUrl + '/sending', request);
    
    console.log('API response', response);

    getSendings();

    return response;
}

export async function saveSubmissionSchedule(object) {
    let act = object.id ? 'update' : 'create';

    let request = {
        "act": act,
        "object": object
    };

    let response = await sendRequest(baseUrl + '/submission_schedules', request);
    return response;
}

export async function saveSendNumber(object) {
    let act = object.id ? "update" : "create";
    let request = {
        "act": act,
        "object": object
    };
    let response = await sendRequest(baseUrl + "/send_numbers", request);
    return response;
}

//--------------------------------------------------

//------------------Удаление------------------------

export function deleteTransporation() {
    /*
    let request = {
        'jwt': localStorage.getItem('skos-token'),
        'companies': admin.companies.filter((company) => typeof company.status !== "undefined" && company.status != 3),
        'type_request': 'companies_change',
    }
    axios
        .post('https://' + host + '/companies', request)
        .then((response) => {
            getCompany();
            if (response.data == 'OK') alert('Успешно сохранено!');
            else console.log(request, response);
        })
    */
}

//--------------------------------------------------

// Модуль «Загрузка и выгрузка документов» — сводный список и действия
export async function getDocumentsList(params = {}) {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.include_deleted) q.set('include_deleted', '1');
    const url = `${baseUrl}/api/documents${q.toString() ? '?' + q.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data;
}

export async function getDocumentTransportation(id) {
    const response = await apiClient.get(`${baseUrl}/api/documents/transportation/${id}`);
    return response.data;
}

export async function getDocumentStudent(id) {
    const response = await apiClient.get(`${baseUrl}/api/documents/student/${id}`);
    return response.data;
}

export async function softDeleteDocument(source, id) {
    const url = source === 'transportation'
        ? `${baseUrl}/api/documents/transportation/${id}`
        : `${baseUrl}/api/documents/student/${id}`;
    await apiClient.patch(url, { action: 'delete' });
}

export async function restoreDocument(source, id) {
    const url = source === 'transportation'
        ? `${baseUrl}/api/documents/transportation/${id}`
        : `${baseUrl}/api/documents/student/${id}`;
    await apiClient.patch(url, { action: 'restore' });
}

export async function downloadDocumentPdf(source, id) {
    const url = source === 'transportation'
        ? `${baseUrl}/api/documents/transportation/${id}/pdf`
        : `${baseUrl}/api/documents/student/${id}/pdf`;
    const response = await apiClient.get(url, { responseType: 'blob' });
    return response.data;
}

export async function saveStudentDocument(documentType, payload) {
    const response = await apiClient.post(`${baseUrl}/api/documents/student`, { document_type: documentType, payload });
    return response.data;
}

export async function updateStudentDocument(id, payload) {
    const response = await apiClient.patch(`${baseUrl}/api/documents/student/${id}`, { payload });
    return response.data;
}

/** Действия с метаданными student document (образец, ссылка на эталон) — см. action в теле. */
export async function patchStudentDocument(id, body) {
    const response = await apiClient.patch(`${baseUrl}/api/documents/student/${id}`, body);
    return response.data;
}

export async function getDocumentExemplars(documentType) {
    const q = documentType ? `?document_type=${encodeURIComponent(documentType)}` : "";
    const response = await apiClient.get(`${baseUrl}/api/documents/exemplars${q}`);
    return response.data;
}

/** @param {number} id — id записи student_documents @param {number|null|undefined} exemplarId — если null/undefined, используется reference_exemplar_id */
export async function compareStudentDocument(id, exemplarId) {
    const body = exemplarId != null && exemplarId !== "" ? { exemplarId } : {};
    const response = await apiClient.post(`${baseUrl}/api/documents/student/${id}/compare`, body);
    return response.data;
}

// Модуль «Проверка документов»
export async function submitDocumentForReview(source, documentId) {
  const response = await apiClient.post(`${baseUrl}/api/document-review/submit`, { source, documentId });
  return response.data;
}

export async function getMyDocumentReviews() {
  const response = await apiClient.get(`${baseUrl}/api/document-review/my`);
  return response.data;
}

export async function getTeacherDocumentReviewSubmissions(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  const url = `${baseUrl}/api/document-review/teacher/submissions${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function getTeacherDocumentReviewSubmission(id) {
  const response = await apiClient.get(`${baseUrl}/api/document-review/teacher/submissions/${id}`);
  return response.data;
}

export async function getTeacherDocumentReviewAuditTrail(id) {
  const response = await apiClient.get(`${baseUrl}/api/document-review/teacher/submissions/${id}/audit-trail`);
  return response.data;
}

export async function getTeacherDocumentReviewMetrics() {
  const response = await apiClient.get(`${baseUrl}/api/document-review/teacher/metrics`);
  return response.data;
}

export async function analyzeDocumentReviewSubmission(id) {
  const response = await apiClient.post(`${baseUrl}/api/document-review/teacher/submissions/${id}/analyze`);
  return response.data;
}

export async function finalizeDocumentReviewSubmission(id, payload) {
  const response = await apiClient.patch(`${baseUrl}/api/document-review/teacher/submissions/${id}/finalize`, payload);
  return response.data;
}

export async function getDocumentReviewTemplates() {
  const response = await apiClient.get(`${baseUrl}/api/document-review/templates`);
  return response.data;
}

export async function saveDocumentReviewTemplate(documentType, payload) {
  const response = await apiClient.put(`${baseUrl}/api/document-review/templates/${encodeURIComponent(documentType)}`, { payload });
  return response.data;
}

//--------------------------------------------------

// Сообщить об ошибке — тикеты
export async function getBugReports() {
    const response = await apiClient.get(`${baseUrl}/api/bug-reports`);
    return response.data;
}

export async function getBugReport(id) {
    const response = await apiClient.get(`${baseUrl}/api/bug-reports/${id}`);
    return response.data;
}

export async function createBugReport(data) {
    const response = await apiClient.post(`${baseUrl}/api/bug-reports`, data);
    return response.data;
}

export async function updateBugReport(id, data) {
    const response = await apiClient.patch(`${baseUrl}/api/bug-reports/${id}`, data);
    return response.data;
}

export async function getBugReportScreenshot(id, fileName) {
    const response = await apiClient.get(`${baseUrl}/api/bug-reports/${id}/screenshots/${encodeURIComponent(fileName)}`, {
        responseType: "blob",
    });
    return response.data;
}

//--------------------------------------------------
// Прогресс учебного сценария (тренажёр документов)
//--------------------------------------------------

export async function postTrainingScenarioProgress(body) {
  const url = `${baseUrl}/api/training/scenario-progress`;
  await apiClient.post(url, body);
}

//--------------------------------------------------
// Модуль «Успеваемость» (только студент, см. isPureStudentAccount)
//--------------------------------------------------

export async function getStudentPerformance() {
  const response = await apiClient.get(`${baseUrl}/api/student/performance`);
  return response.data;
}

export async function postStudentProfileChangeRequest(payload) {
  const response = await apiClient.post(`${baseUrl}/api/student/profile/change-request`, payload);
  return response.data;
}

export async function postBeginnerSessionStart() {
  const response = await apiClient.post(`${baseUrl}/api/student/beginner-session/start`);
  return response.data;
}

export async function postBeginnerSessionEnd(sessionId) {
  const response = await apiClient.post(`${baseUrl}/api/student/beginner-session/${sessionId}/end`);
  return response.data;
}

export async function postReferenceMaterialView(documentId) {
  await apiClient.post(`${baseUrl}/api/student/reference-views/${documentId}`);
}

//--------------------------------------------------
// Модуль «Уведомления и дедлайны»
//--------------------------------------------------

export async function getNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params.unreadOnly) query.set("unreadOnly", "1");
  const url = `${baseUrl}/api/notifications${query.toString() ? "?" + query.toString() : ""}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await apiClient.patch(`${baseUrl}/api/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch(`${baseUrl}/api/notifications/read-all`);
  return response.data;
}

export async function getNotificationStudents() {
  const response = await apiClient.get(`${baseUrl}/api/notifications/student-users`);
  return response.data;
}

export async function getNotificationGroups() {
  const response = await apiClient.get(`${baseUrl}/api/notifications/groups`);
  return response.data;
}

export async function createNotifications(payload) {
  const response = await apiClient.post(`${baseUrl}/api/notifications`, payload);
  return response.data;
}

export async function getNotificationsCatalog() {
  const response = await apiClient.get(`${baseUrl}/api/notifications/catalog`);
  return response.data;
}

export async function getLearningDeadlines(params = {}) {
  const query = new URLSearchParams();
  if (params.userId) query.set("userId", String(params.userId));
  const url = `${baseUrl}/api/learning-deadlines${query.toString() ? "?" + query.toString() : ""}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function saveLearningDeadline(payload) {
  const response = await apiClient.post(`${baseUrl}/api/learning-deadlines`, payload);
  return response.data;
}

export async function saveLearningDeadlineForGroup(payload) {
  const response = await apiClient.post(`${baseUrl}/api/learning-deadlines/by-group`, payload);
  return response.data;
}

export async function deleteLearningDeadline(id) {
  const response = await apiClient.delete(`${baseUrl}/api/learning-deadlines/${id}`);
  return response.data;
}

//--------------------------------------------------

function processingArray(array) {
    if (!Array.isArray(array)) {
        return {};
    }
    const object = {};
    array.forEach((item) => {
        if (item && item.id !== undefined) {
            object[item.id] = item;
        }
    });
    return object;
}

function convertDate(date)
{
    return date ? date.split('T')[0] : date;
}

async function sendRequest(url, request)
{
    let result = [];

    await apiClient
        .post(url, request)
        .then((response) => {
            if (response.status === 200)
            {
                result = response.data;
            }
            else
            {
                console.log(response);
            }
        })
        .catch((error) => {
            console.error('API request error:', error);
            if (error.response && error.response.status === 401) {
                // Не редиректим сразу — страница покажет ошибку, пользователь может нажать «Выйти»
                console.warn('401 Unauthorized — нажмите «Выйти» для повторного входа.');
            }
            throw error;
        });

    return result;
}
