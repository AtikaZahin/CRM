export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.18.188.140:8000";

export const WS_URL = API_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
