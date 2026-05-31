import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const AUTH_STORAGE_KEY = "seal_auth";

export const authStorage = {
  get() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(payload) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },
};
export const logout = async () => {
  const auth = authStorage.get();
  if (auth?.accessToken) {
    try {
      await http.post("/api/auth/logout", { accessToken: auth.accessToken });
    } catch {
      // best-effort — clear locally regardless
    }
  }
  authStorage.clear();
  window.location.href = "/login";
};
export const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const auth = authStorage.get();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register");

    if (error?.response?.status === 401 && !isAuthRequest) {
      authStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
