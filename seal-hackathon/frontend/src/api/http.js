import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;
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
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});


export function getApiErrorMessage(error, fallback = "Request failed") {
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please check whether the backend is running and try Refresh.";
  }
  if (!error?.response && error?.message === "Network Error") {
    return "Cannot connect to backend. Please check http://localhost:8080.";
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
      requestUrl.includes("/api/auth/register");

    if (error?.response?.status === 401 && !isAuthRequest) {
      authStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
