import { createRouter, createWebHistory } from "vue-router";
import { isAuthenticated, initKeycloak, isPureStudentAccount, isStudent, isAppAdmin } from "@/helpers/keycloak";

// Initialize Keycloak once; router guard can await this without re-triggering init per navigation.
const keycloakReady = initKeycloak().catch((e) => {
    console.error('Keycloak initialization error (router module):', e);
    return false;
});

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/", //Страница авторизации
            name: "authotrization",
            component: () => import("../views/AuthorizationView.vue"),
        },
        {
            path: "/menu", //Страница меню
            name: "menu",
            component: () => import("../views/MenuView.vue"),
        },
        {
            path: "/transporation", //Страница грузоперевозок
            name: "transporation",
            redirect: "/transporation/menu",
            children: [
                {
                    path: "menu", //Страница меню грузоперевозок
                    name: "transporation-menu",
                    component: () => import("../views/TransportationMenuView.vue"),
                },
                {
                    path: "create/:id?", //Страница создания заявки на грузоперевозку
                    name: "transporation-create",
                    component: () => import("../views/TransportationCreateView.vue"),
                },
            ],
        },
        {
            path: "/invoice", //Страница накладной
            name: "invoice",
            redirect: "/invoice/menu",
            children: [
                {
                    path: "menu", //Страница меню грузоперевозок
                    name: "invoice-menu",
                    component: () => import("../views/InvoiceMenuView.vue"),
                },
                {
                    path: "create/:id?",
                    name: "invoice-create",
                    component: () => import("../views/InvoiceCreateView.vue"),
                },
            ],
        },
        {
            path: "/act", //Страница актов
            name: "act",
            redirect: "/act/menu",
            children: [
                {
                    path: "menu", //Страница меню актов
                    name: "act-menu",
                    component: () => import("../views/ActMenuView.vue"),
                },
                {
                    path: "common", //Страница общих актов
                    redirect: "/act/common/menu",
                    name: "act-common",
                    children: [
                        {
                            path: "menu", //Страница меню общих актов
                            name: "act-common-menu",
                            component: () => import("../views/CommonActMenuView.vue"),
                        },
                        {
                            path: "create/:id?",
                            name: "act-common-create",
                            component: () => import("../views/CommonActCreateView.vue"),
                        },
                    ],
                },
                {
                    path: "commercial", //Страница коммерческих актов
                    redirect: "/act/commercial/menu",
                    name: "act-commercial",
                    children: [
                        {
                            path: "menu", //Страница меню коммерческих актов
                            name: "act-commercial-menu",
                            component: () => import("../views/CommercialActMenuView.vue"),
                        },
                        {
                            path: "create/:id?",
                            name: "act-commercial-create",
                            component: () => import("../views/CommercialActCreateView.vue"),
                        },
                    ],
                },
            ],
        },
        {
            path: "/reminder", //Страница памятки
            name: "reminder",
            redirect: "/reminder/menu",
            children: [
                {
                    path: "menu", //Страница меню памятки
                    name: "reminder-menu",
                    component: () => import("../views/ReminderMenuView.vue"),
                },
                {
                    path: "create/:id?",
                    name: "reminder-create",
                    component: () => import("../views/ReminderCreateView.vue"),
                },
            ],
        },
        {
            path: "/filling-statement", //Страница ведомости подачи и уборки
            name: "filling-statement",
            redirect: "/filling-statement/menu",
            children: [
                {
                    path: "menu", //Страница меню ведомости подачи и уборки
                    name: "filling-statement-menu",
                    component: () => import("../views/FillingStatementMenuView.vue"),
                },
                {
                    path: "create/:id?",
                    name: "filling-statement-create",
                    component: () => import("../views/FillingStatementCreateView.vue"),
                },
            ],
        },
        {
            path: "/cumulative-statement", //Страница накопительной ведомости
            name: "cumulative-statement",
            redirect: "/cumulative-statement/menu",
            children: [
                {
                    path: "menu", //Страница меню накопительной ведомости
                    name: "cumulative-statement-menu",
                    component: () => import("../views/CumulativeStatementMenuView.vue"),
                },
                {
                    path: "create/:id?",
                    name: "cumulative-statement-create",
                    component: () => import("../views/CumulativeStatementCreateView.vue"),
                },
            ],
        },
        {
            path: "/documents",
            name: "documents",
            redirect: "/documents/list",
            children: [
                {
                    path: "list",
                    name: "documents-list",
                    component: () => import("../views/DocumentsListView.vue"),
                },
                {
                    path: "view/:source/:id",
                    name: "documents-view",
                    component: () => import("../views/DocumentViewView.vue"),
                },
            ],
        },
        {
            path: "/beginner-scenario", //Страница Сценарий обучения "Новичок"
            name: "beginner-scenario",
            redirect: "/beginner-scenario/menu",
            children: [
                {
                    path: "menu", //Страница меню Сценарий обучения "Новичок"
                    name: "beginner-scenario-menu",
                    component: () => import("../views/BeginnerScenarioMenuView.vue"),
                },
            ],
        },
         {
            path: "/beginner-simulator", //Страница Сценарий обучения "Новичок" - Тренажер
            name: "beginner-simulator",
            redirect: "/beginner-simulator/menu",
            children: [
                {
                    path: "menu", //Страница меню Сценарий обучения "Новичок" - Тренажер
                    name: "beginner-simulator-menu",
                    component: () => import("../views/BeginnerSimulatorMenuView.vue"),
                },
            ],
        },
        {
            path: "/beginner-instructions", //Страница Сценарий "Новичок" - Инструкции
            name: "beginner-instructions",
            redirect: "/beginner-instructions/menu",
            children: [
                {
                    path: "menu", //Страница меню Сценарий "Новичок" - Инструкции
                    name: "beginner-instructions-menu",
                    component: () => import("../views/BeginnerInstructionsView.vue"),
                },
                {
                    path: "transporation", //Страница Сценарий "Новичок" - Инструкции - Инструкции на заявку по грузоперевозке
                    name: "beginner-instructions-transporation",
                    component: () => import("../views/BeginnerTransporationView.vue"),
                },
                {
                    path: "filling-rules",
                    name: "beginner-instructions-filling-rules-menu",
                    component: () => import("../views/BeginnerInstructionsFillingRulesMenuView.vue"),
                },
                {
                    path: "filling-rules/:docType",
                    name: "beginner-instructions-filling-rules-detail",
                    component: () => import("../views/BeginnerInstructionsFillingRulesDetailView.vue"),
                },
            ],
        },
        {
            path: "/advanced-scenario", //Страница Сценарий обучения "Продвинутый"
            name: "advanced-scenario",
            redirect: "/advanced-scenario/menu",
            children: [
                {
                    path: "menu", //Страница меню Сценарий обучения "Продвинутый"
                    name: "advanced-scenario-menu",
                    component: () => import("../views/AdvancedScenarioMenuView.vue"),
                },
            ],
        },
        {
            path: "/advanced-simulator", //Страница Сценарий обучения "Продвинутый" - Тренажер
            name: "advanced-simulator",
            redirect: "/advanced-simulator/menu",
            children: [
                {
                    path: "menu", //Страница меню Сценарий обучения "Продвинутый" - Тренажер
                    name: "advanced-simulator-menu",
                    component: () => import("../views/AdvancedSimulatorMenuView.vue"),
                },
            ],
        },
        {
            path: "/student-performance",
            name: "student-performance",
            component: () => import("../views/StudentPerformanceView.vue"),
        },
        {
            path: "/report-error",
            name: "report-error",
            component: () => import("../views/ReportErrorView.vue"),
        },
        {
            path: "/notifications",
            name: "notifications",
            component: () => import("../views/NotificationsView.vue"),
        },
        {
            path: "/test-mode", // Режим теста: пройти тест, банк заданий, конструктор (всё в одном разделе)
            name: "test-mode",
            component: () => import("../views/TestModeView.vue"),
        },
        {
            path: "/question-bank",
            redirect: { name: "test-mode", query: { tab: "bank" } },
        },
        {
            path: "/test-constructor",
            redirect: { name: "test-mode", query: { tab: "constructor" } },
        },
        {
            path: "/admin", // Панель управления (администратор тренажёра)
            name: "admin-panel",
            component: () => import("../views/AdminPanelView.vue"),
        },
        {
            path: "/teacher-dashboard", // Панель преподавателя
            name: "teacher-dashboard",
            component: () => import("../views/TeacherDashboardView.vue"),
        },
        {
            path: "/reference", // Страница Справочник
            name: "reference",
            component: () => import("../views/ReferenceView.vue"),
        },
        {
            path: "/dictionary-module", // Страница Заполнение справочников
            name: "dictionary-module",
            component: () => import("../views/DictionaryModuleView.vue"),
        },
        {
            path: "/scenarios", // Страница Сценарии (банк сценариев)
            name: "scenarios",
            component: () => import("../views/ScenariosView.vue"),
        },
    ],
});

const PAGE_TITLE = {
    authotrization: "Авторизация",
    menu: "Тренажёр ОТРЭД главное меню",
    "transporation-menu": "Заявка на грузоперевозку",
    "transporation-create": "Заявка на грузоперевозку",
    "invoice-menu": "Накладная",
    "invoice-create": "Накладная ",
    "invoice-menu": "Накладная",
    "invoice-create": "Накладная ",
    "report-error": "Тренажёр ОТРЭД - Сообщить об ошибке",
    notifications: "Тренажёр ОТРЭД - Уведомления и дедлайны",
    "test-mode": "Тренажёр ОТРЭД - Режим теста",
    reference: "Тренажёр ОТРЭД - Справочник",
    scenarios: "Тренажёр ОТРЭД - Сценарии",
    "admin-panel": "Тренажёр ОТРЭД - Панель управления",
    "teacher-dashboard": "Тренажёр ОТРЭД - Панель преподавателя",
    "dictionary-module": "Тренажёр ОТРЭД - Заполнение справочников",
    "student-performance": "Тренажёр ОТРЭД - Успеваемость",
};

// Navigation guard to protect routes
router.beforeEach(async (to, from, next) => {
    // Wait for Keycloak initialization without re-triggering it.
    const authenticated = await keycloakReady;

    // Allow access to authorization page
    if (to.name === 'authotrization') {
        // If already authenticated, redirect to menu
        if (authenticated || isAuthenticated()) {
            next({ name: 'menu' });
        } else {
            next();
        }
        return;
    }

    // Check authentication for all other routes
    if (authenticated || isAuthenticated()) {
        if (to.name === 'admin-panel' && !isAppAdmin()) {
            next({ name: 'menu' });
            return;
        }
        if (to.name === 'student-performance' && !isStudent()) {
            next({ name: 'menu' });
            return;
        }
        next();
    } else {
        // Redirect to login if not authenticated
        next({ name: 'authotrization' });
    }
});

function isNoviceEntryPath(path) {
    return (
        path.startsWith("/beginner-scenario") ||
        path.startsWith("/beginner-simulator") ||
        path.startsWith("/beginner-instructions")
    );
}

function isNoviceSessionExtendedPath(path) {
    if (isNoviceEntryPath(path)) return true;
    if (path.startsWith("/transporation")) return true;
    if (path.startsWith("/invoice")) return true;
    if (path.startsWith("/act")) return true;
    if (path.startsWith("/reminder")) return true;
    if (path.startsWith("/filling-statement")) return true;
    if (path.startsWith("/cumulative-statement")) return true;
    if (path.startsWith("/student-performance")) return true;
    if (path.startsWith("/reference")) return true;
    return false;
}

router.afterEach(async (toRoute, fromRoute) => {
    window.document.title = PAGE_TITLE[toRoute.name] ?? "Тренажёр ОТРЭД";
    if (toRoute.name === "menu") {
        sessionStorage.removeItem("irtran-training-profile");
    }

    try {
        if (!isAuthenticated() || !isPureStudentAccount()) return;

        const { postBeginnerSessionStart, postBeginnerSessionEnd } = await import("@/helpers/API");

        const sid = sessionStorage.getItem("irtran-beginner-sid");
        const toPath = toRoute.path || "";

        if (sid && !isNoviceSessionExtendedPath(toPath)) {
            try {
                await postBeginnerSessionEnd(Number(sid));
            } catch (e) {
                console.warn("beginner session end:", e);
            }
            sessionStorage.removeItem("irtran-beginner-sid");
        }

        if (!sessionStorage.getItem("irtran-beginner-sid") && isNoviceEntryPath(toPath)) {
            try {
                const r = await postBeginnerSessionStart();
                if (r && r.id != null) {
                    sessionStorage.setItem("irtran-beginner-sid", String(r.id));
                }
            } catch (e) {
                console.warn("beginner session start:", e);
            }
        }
    } catch (_) {
        /* ignore */
    }
});

export default router;
