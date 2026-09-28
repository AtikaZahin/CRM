import Dexie, { Table } from 'dexie';

/**
 * One cached API response.
 * - ownerKey: whose data this is ("staff:4", "customer:1" or "public")
 * - url:      the request path + query, e.g. "/tickets?status=OPEN"
 */
export interface CachedResponse {
    id?: number;
    ownerKey: string;
    url: string;
    data: unknown;
    savedAt: number; // ms since epoch
}

class OfflineDB extends Dexie {
    responses!: Table<CachedResponse, number>;

    constructor() {
        super('crm_offline_cache');
        this.version(1).stores({
            // ++id = auto key; [ownerKey+url] = unique lookup; ownerKey / savedAt for pruning
            responses: '++id, &[ownerKey+url], ownerKey, savedAt',
        });
    }
}

export const offlineDb = new OfflineDB();