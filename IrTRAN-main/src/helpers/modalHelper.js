export function openModalSafely(modalId) {
    const dom = window.document;
    const modalEl = dom.getElementById(modalId);
    if (!modalEl) return;
    const bs = window.bootstrap;
    const jq = window.jQuery || window.$;
    let opened = false;

    try {
        if (bs?.Modal) {
            const instance = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
            instance.show();
            opened = true;
        }
    } catch (_) {
        opened = false;
    }

    if (!opened) {
        try {
            if (jq && typeof jq(modalEl).modal === "function") {
                jq(modalEl).modal("show");
                opened = true;
            }
        } catch (_) {
            opened = false;
        }
    }

    if (!opened) {
        try {
            modalEl.classList.add("show", "in");
            modalEl.style.display = "block";
            modalEl.setAttribute("aria-modal", "true");
            modalEl.setAttribute("role", "dialog");
            modalEl.removeAttribute("aria-hidden");
            dom.body.classList.add("modal-open");
            if (!dom.querySelector(".modal-backdrop")) {
                const backdrop = dom.createElement("div");
                backdrop.className = "modal-backdrop fade show";
                dom.body.appendChild(backdrop);
            }
        } catch (_) {
            // noop
        }
    }
}

export function closeModalSafely(modalId) {
    try {
        const dom = window.document;
        if (dom.activeElement && typeof dom.activeElement.blur === "function") {
            dom.activeElement.blur();
        }
        const modalEl = dom.getElementById(modalId);
        if (!modalEl) return;
        const bs = window.bootstrap;
        const jq = window.jQuery || window.$;

        if (bs?.Modal) {
            const instance = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
            instance.hide();
            window.setTimeout(() => {
                try {
                    const still = bs.Modal.getInstance(modalEl);
                    still?.dispose?.();
                } catch (_) {
                    // noop
                }
            }, 220);
        }
        if (jq && typeof jq(modalEl).modal === "function") {
            jq(modalEl).modal("hide");
            try {
                jq(modalEl).off("shown.bs.modal hidden.bs.modal");
            } catch (_) {
                // noop
            }
        }

        const forceCleanup = () => {
            modalEl.classList.remove("show", "in");
            modalEl.style.display = "none";
            modalEl.removeAttribute("aria-modal");
            dom.body.classList.remove("modal-open");
            dom.body.style.removeProperty("padding-right");
            dom.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
        };

        forceCleanup();
        window.requestAnimationFrame(forceCleanup);
        window.setTimeout(forceCleanup, 200);
    } catch (_) {
        // noop
    }
}
