import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config';
import {
  buildUrlKey,
  ownerKeyFromAuthHeader,
  saveResponse,
  loadResponse,
  deleteExpired,
} from '../offline/cache';
import { configureHealthUrl, getOfflineState, markOffline, markOnline } from '../offline/status';
import toast from 'react-hot-toast';
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

configureHealthUrl(`${API_URL}/health/db`);
deleteExpired();

export const OFFLINE_ACTION_MESSAGE = "You're offline – this action is unavailable until you reconnect.";

/** Offline = no response at all, or the backend says the database is unreachable. */
const isOfflineError = (error: AxiosError) =>
  !error.response || [502, 503, 504].includes(error.response.status);

// Request Interceptor: attach the staff token (unless a token is already set),
// and block every data-changing request while offline.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('staff_token');
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get' && getOfflineState().isOffline) {
      const err = new AxiosError(OFFLINE_ACTION_MESSAGE, 'ERR_OFFLINE', config);
      // Shape it like a server error so existing pages show this text in their toast.
      err.response = {
        status: 0,
        statusText: 'Offline',
        data: { detail: OFFLINE_ACTION_MESSAGE },
        headers: {},
        config,
      } as any;
      return Promise.reject(err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const cacheKeysFor = (config: InternalAxiosRequestConfig) => ({
  ownerKey: ownerKeyFromAuthHeader(config.headers?.Authorization),
  urlKey: buildUrlKey(config.url || '', config.params),
});

// Response Interceptor:
// - successful GET  -> save a copy for offline use
// - failed GET because we're offline -> return the saved copy instead
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    if ((config.method || 'get').toLowerCase() === 'get') {
      markOnline();
      const { ownerKey, urlKey } = cacheKeysFor(config);
      saveResponse(ownerKey, urlKey, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    if (error.code === 'ERR_OFFLINE') return Promise.reject(error);

    if (config && (config.method || 'get').toLowerCase() === 'get' && isOfflineError(error)) {
      const { ownerKey, urlKey } = cacheKeysFor(config);
      const cached = await loadResponse(ownerKey, urlKey);
      markOffline(cached?.savedAt);
      if (cached) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (offline cache)',
          headers: { 'x-from-offline-cache': '1' },
          config,
        };
      }
      toast.error("This page wasn't opened while online, so it isn't saved for offline use.", { id: 'not-cached' });
      const notCached = new AxiosError(
        'Not available offline yet – open this page once while online.',
        'ERR_NOT_CACHED',
        config
      );
      notCached.response = {
        status: 0,
        statusText: 'Offline',
        data: { detail: 'Not available offline yet – open this page once while online.' },
        headers: {},
        config,
      } as any;
      return Promise.reject(notCached);
    }

    if (config && isOfflineError(error)) markOffline();
    return Promise.reject(error);
  }
);