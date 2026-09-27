const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();

export const WS_URL = API_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
