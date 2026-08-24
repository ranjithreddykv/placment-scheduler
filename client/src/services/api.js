import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const datasetApi = {
  generate: (seed) => api.post('/dataset/generate', seed ? { seed } : {}).then((r) => r.data),
};

export const studentApi = {
  list: (params) => api.get('/students', { params }).then((r) => r.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data),
};

export const companyApi = {
  list: (params) => api.get('/companies', { params }).then((r) => r.data),
  get: (id) => api.get(`/companies/${id}`).then((r) => r.data),
};

export const roomApi = {
  list: () => api.get('/rooms').then((r) => r.data),
};

export const scheduleApi = {
  generate: () => api.post('/schedule/generate').then((r) => r.data),
  get: (params) => api.get('/schedule', { params }).then((r) => r.data),
  metrics: () => api.get('/schedule/metrics').then((r) => r.data),
  history: () => api.get('/schedule/history').then((r) => r.data),
  historyVersion: (version) => api.get(`/schedule/history/${version}`).then((r) => r.data),
};

export const replanApi = {
  companyDelay: (payload) => api.post('/replan/company-delay', payload).then((r) => r.data),
  panelDrop: (payload) => api.post('/replan/panel-drop', payload).then((r) => r.data),
  studentWithdraw: (payload) => api.post('/replan/student-withdraw', payload).then((r) => r.data),
  roomUnavailable: (payload) => api.post('/replan/room-unavailable', payload).then((r) => r.data),
};

export default api;
