/**
 * Tiny global store for "are we offline?".
 * Plain JS (not React) so the axios interceptor can update it too.
 */
type Listener = () => void;

interface OfflineState {
    isOffline: boolean;
    /** When the cached data currently on screen was saved (ms), or null. */
    dataFrom: number | null;
    /** Set true for a short time after coming back online. */
    justReconnected: boolean;
}

let state: OfflineState = {
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    dataFrom: null,
    justReconnected: false,
};
const listeners = new Set<Listener>();

const emit = () => {
    document.documentElement.classList.toggle('is-offline', state.isOffline);
    listeners.forEach((l) => l());
};

export const getOfflineState = () => state;

export const subscribeOffline = (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

export const markOffline = (dataFrom?: number) => {
    const next = {
        isOffline: true,
        justReconnected: false,
        // keep the OLDEST timestamp shown, so the banner never overstates freshness
        dataFrom:
            dataFrom == null ? state.dataFrom : state.dataFrom == null ? dataFrom : Math.min(state.dataFrom, dataFrom),
    };
    if (next.isOffline !== state.isOffline || next.dataFrom !== state.dataFrom) {
        state = next;
        emit();
    }
    startHealthPolling();
};

export const markOnline = () => {
    if (!state.isOffline) return;
    state = { isOffline: false, dataFrom: null, justReconnected: true };
    stopHealthPolling();
    emit();
};

export const dismissReconnected = () => {
    if (!state.justReconnected) return;
    state = { ...state, justReconnected: false };
    emit();
};

// ---- Health polling while offline -------------------------------------------
// /health/db returns 200 only if the backend AND the database are reachable.

let pollTimer: number | null = null;
let healthUrl = '';

export const configureHealthUrl = (url: string) => {
    healthUrl = url;
};

const checkHealth = async () => {
    if (!healthUrl) return;
    try {
        const res = await fetch(healthUrl, { cache: 'no-store' });
        if (res.ok) markOnline();
    } catch {
        /* still offline */
    }
};

function startHealthPolling() {
    if (pollTimer != null) return;
    pollTimer = window.setInterval(checkHealth, 15000);
}

function stopHealthPolling() {
    if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// Browser-level network events
if (typeof window !== 'undefined') {
    window.addEventListener('offline', () => markOffline());
    window.addEventListener('online', () => {
        checkHealth();
    });
    if (state.isOffline) {
        document.documentElement.classList.add('is-offline');
        startHealthPolling();
    }
}