import { offlineDb } from './db';

/**
 * Read-only offline cache for API GET responses.
 *
 * Rules (IMPLEMENTATION_PLAN.md, Phase 10):
 * - Each account has its own cache ("owner key"), so Meena never sees Ravi's data.
 * - Only data the server already returned to that account is stored.
 * - Logout deletes that account's cache; anything older than 7 days is deleted.
 * - Size limits keep only what is still useful.
 */

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES_PER_OWNER = 150;
const MAX_MESSAGES_PER_TICKET = 200;
const MAX_RESOLVED_TICKETS = 30;
const RESOLVED_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_ANNOUNCEMENTS = 20;
const MAX_ORDERS = 50;

// ---- Owner key ---------------------------------------------------------------

/** "staff:4" / "customer:1" from a JWT, or "public" when there is no token. */
export const ownerKeyFromToken = (token?: string | null): string => {
    if (!token) return 'public';
    try {
        const part = token.split('.')[1];
        const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json);
        if (payload.typ && payload.sub) return `${payload.typ}:${payload.sub}`;
    } catch {
        /* malformed token */
    }
    return 'public';
};

export const ownerKeyFromAuthHeader = (header?: unknown): string => {
    if (typeof header !== 'string') return 'public';
    return ownerKeyFromToken(header.replace(/^Bearer\s+/i, ''));
};

// ---- URL key -----------------------------------------------------------------

/** Stable key: path + sorted query, without the API origin. */
export const buildUrlKey = (url: string, params?: Record<string, unknown>): string => {
    const u = new URL(url, 'http://x'); // base only used for relative URLs
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
        });
    }
    u.searchParams.sort();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    const qs = u.searchParams.toString();
    return qs ? `${path}?${qs}` : path;
};

// ---- Trimming rules ----------------------------------------------------------

const timeOf = (item: any): number => {
    const raw = item?.updated_at || item?.created_at;
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
};

const trimTickets = (tickets: any[]): any[] => {
    const cutoff = Date.now() - RESOLVED_WINDOW_MS;
    const resolvedKeep = new Set(
        tickets
            .filter((t) => t?.status === 'RESOLVED' && timeOf(t) >= cutoff)
            .sort((a, b) => timeOf(b) - timeOf(a))
            .slice(0, MAX_RESOLVED_TICKETS)
    );
    return tickets.filter((t) => t?.status !== 'RESOLVED' || resolvedKeep.has(t));
};

const newestN = (items: any[], n: number): any[] => {
    if (items.length <= n) return items;
    const keep = new Set([...items].sort((a, b) => timeOf(b) - timeOf(a)).slice(0, n));
    return items.filter((i) => keep.has(i)); // keep the server's original order
};

const trimForUrl = (urlKey: string, data: unknown): unknown => {
    if (!Array.isArray(data)) return data;
    const path = urlKey.split('?')[0];

    if (/^\/(customer\/)?tickets\/\d+\/messages$/.test(path)) {
        return data.slice(-MAX_MESSAGES_PER_TICKET); // newest messages are last
    }
    if (/^\/(customer\/)?tickets$/.test(path)) return trimTickets(data);
    if (/^\/announcements$/.test(path)) return newestN(data, MAX_ANNOUNCEMENTS);
    if (/^\/orders\/me$/.test(path)) return newestN(data, MAX_ORDERS);
    return data;
};

// ---- Public API --------------------------------------------------------------

export const saveResponse = async (ownerKey: string, urlKey: string, data: unknown) => {
    try {
        const trimmed = trimForUrl(urlKey, data);
        await offlineDb.transaction('rw', offlineDb.responses, async () => {
            const existing = await offlineDb.responses.where('[ownerKey+url]').equals([ownerKey, urlKey]).first();
            const row = { ownerKey, url: urlKey, data: trimmed, savedAt: Date.now() };
            if (existing?.id != null) await offlineDb.responses.put({ ...row, id: existing.id });
            else await offlineDb.responses.add(row);
        });
        await pruneOwner(ownerKey);
    } catch (err) {
        console.warn('Offline cache: save failed', err);
    }
};

export const loadResponse = async (ownerKey: string, urlKey: string) => {
    try {
        const row = await offlineDb.responses.where('[ownerKey+url]').equals([ownerKey, urlKey]).first();
        if (!row) return null;
        if (Date.now() - row.savedAt > MAX_AGE_MS) {
            await offlineDb.responses.delete(row.id!);
            return null;
        }
        return row;
    } catch (err) {
        console.warn('Offline cache: load failed', err);
        return null;
    }
};

/** Keep at most MAX_ENTRIES_PER_OWNER responses per account (oldest removed first). */
export const pruneOwner = async (ownerKey: string) => {
    const rows = await offlineDb.responses.where('ownerKey').equals(ownerKey).sortBy('savedAt');
    const extra = rows.length - MAX_ENTRIES_PER_OWNER;
    if (extra > 0) {
        await offlineDb.responses.bulkDelete(rows.slice(0, extra).map((r) => r.id!));
    }
};

/** Called on logout: delete everything cached for this account. */
export const clearCacheForToken = async (token?: string | null) => {
    const ownerKey = ownerKeyFromToken(token);
    if (ownerKey === 'public') return;
    try {
        await offlineDb.responses.where('ownerKey').equals(ownerKey).delete();
    } catch (err) {
        console.warn('Offline cache: clear failed', err);
    }
};

/** Delete every entry older than 7 days (runs once at startup). */
export const deleteExpired = async () => {
    try {
        await offlineDb.responses.where('savedAt').below(Date.now() - MAX_AGE_MS).delete();
    } catch {
        /* IndexedDB unavailable (e.g. private mode) – the app still works online */
    }
};