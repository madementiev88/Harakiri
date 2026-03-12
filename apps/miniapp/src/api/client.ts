import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && authToken) {
      // Token expired — try silent re-auth
      if (!refreshPromise) {
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          refreshPromise = apiClient
            .post('/auth', { initData })
            .then((res) => {
              const newToken = res.data.token;
              setAuthToken(newToken);
              refreshPromise = null;
              return newToken;
            })
            .catch(() => {
              refreshPromise = null;
              throw error;
            });
        }
      }

      if (refreshPromise) {
        const newToken = await refreshPromise;
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
