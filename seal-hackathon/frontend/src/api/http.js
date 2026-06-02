import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const AUTH_STORAGE_KEY = "seal_auth";
const GOOGLE_REGISTRATION_STORAGE_KEY = "seal_google_registration";
const PASSWORD_RESET_STORAGE_KEY = "seal_password_reset";

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

export const googleRegistrationStorage = {
  get() {
    const raw = sessionStorage.getItem(GOOGLE_REGISTRATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(payload) {
    sessionStorage.setItem(GOOGLE_REGISTRATION_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(GOOGLE_REGISTRATION_STORAGE_KEY);
  },
};

export const passwordResetStorage = {
  get() {
    const raw = sessionStorage.getItem(PASSWORD_RESET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(payload) {
    sessionStorage.setItem(PASSWORD_RESET_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
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
  timeout: 15000, // Tăng nhẹ timeout lên 15s để bao dung hơn cho gói cloud free lúc khởi động
  headers: {
    "Content-Type": "application/json",
  },
});

export function resolveAssetUrl(value) {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    try {
      return `${new URL(BASE_URL || window.location.origin).origin}${value}`;
    } catch {
      return value;
    }
  }
  return value;
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. The server is taking too long to respond. Please try Refreshing.";
  }
  if (!error?.response && error?.message === "Network Error") {
    return "Cannot connect to backend. The live server might be waking up from automatic sleep mode (takes ~1 minute). Please wait a moment and try again.";
  }
  return error?.response?.data?.message || error?.message || fallback;
}

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
      requestUrl.includes("/api/auth/register") ||
      requestUrl.includes("/api/auth/google");

    if (error?.response?.status === 401 && !isAuthRequest) {
      authStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
