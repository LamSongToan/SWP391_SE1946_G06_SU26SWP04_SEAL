import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || BASE_URL;
const AUTH_STORAGE_KEY = "seal_auth";
const GOOGLE_REGISTRATION_STORAGE_KEY = "seal_google_registration";
const REGISTRATION_VERIFICATION_STORAGE_KEY = "seal_registration_verification";
const PASSWORD_RESET_STORAGE_KEY = "seal_password_reset";
const REJECTED_REGISTRATION_STORAGE_KEY = "seal_rejected_registration";

export const authStorage = {
  get() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },
  set(payload, remember = true) {
    const targetStorage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem(AUTH_STORAGE_KEY);
    targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  },
  update(payload) {
    const inLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    const targetStorage = inLocal ? localStorage : sessionStorage;
    targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  },
};

export const googleRegistrationStorage = {
  get() {
    try {
      const raw = sessionStorage.getItem(GOOGLE_REGISTRATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(GOOGLE_REGISTRATION_STORAGE_KEY);
      return null;
    }
  },
  set(payload) {
    sessionStorage.setItem(GOOGLE_REGISTRATION_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(GOOGLE_REGISTRATION_STORAGE_KEY);
  },
};

export const registrationVerificationStorage = {
  get() {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_VERIFICATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(REGISTRATION_VERIFICATION_STORAGE_KEY);
      return null;
    }
  },
  set(payload) {
    sessionStorage.setItem(REGISTRATION_VERIFICATION_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(REGISTRATION_VERIFICATION_STORAGE_KEY);
  },
};

export const passwordResetStorage = {
  get() {
    try {
      const raw = sessionStorage.getItem(PASSWORD_RESET_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
      return null;
    }
  },
  set(payload) {
    sessionStorage.setItem(PASSWORD_RESET_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
  },
};

export const rejectedRegistrationStorage = {
  get() {
    try {
      const raw = sessionStorage.getItem(REJECTED_REGISTRATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(REJECTED_REGISTRATION_STORAGE_KEY);
      return null;
    }
  },
  set(payload) {
    sessionStorage.setItem(REJECTED_REGISTRATION_STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(REJECTED_REGISTRATION_STORAGE_KEY);
  },
};

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function isAuthExpired(auth = authStorage.get()) {
  if (!auth?.accessToken) {
    return true;
  }

  const payload = decodeJwtPayload(auth.accessToken);
  if (!payload?.exp) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
}

export function isAuthSessionValid(auth = authStorage.get()) {
  return Boolean(auth?.accessToken) && !isAuthExpired(auth);
}

export const logout = async () => {
  const auth = authStorage.get();
  if (auth?.accessToken) {
    try {
      await http.post("/api/auth/logout");
    } catch {
      // Best effort only; always clear local auth state.
    }
  }
  authStorage.clear();
  window.location.href = "/login";
};

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Allow free cloud backends a little extra time to wake up.
  headers: {
    "Content-Type": "application/json",
  },
});

export function resolveAssetUrl(value) {
  if (!value) {
    return "";
  }
  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return "";
  }
  if (/^(https?:|data:|blob:)/i.test(normalizedValue)) {
    return normalizedValue;
  }

  try {
    const assetOrigin = new URL(ASSET_BASE_URL || BASE_URL || window.location.origin, window.location.origin).origin;
    const assetPath = normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;
    return `${assetOrigin}${assetPath}`;
  } catch {
    return normalizedValue;
  }
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
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  const auth = authStorage.get();
  if (auth?.accessToken) {
    if (isAuthExpired(auth)) {
      authStorage.clear();
      window.location.href = "/login?sessionExpired=1";
      return Promise.reject(new Error("Session expired"));
    }
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
      window.location.href = "/login?sessionExpired=1";
    }
    return Promise.reject(error);
  }
);
