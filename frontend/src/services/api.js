import { api, API_URL } from '../contexts/AuthContext';

export const analyticsAPI = {
  getKPIs: (params = {}) => api.get('/analytics/kpis', { params }),
  getCharts: (params = {}) => api.get('/analytics/charts', { params }),
  getMapMarkers: () => api.get('/analytics/map-markers'),
  getFilters: () => api.get('/analytics/filters'),
  getAreaAnalytics: (params) => api.get('/analytics/area', { params })
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getDatasets: () => api.get('/admin/datasets'),
  uploadCSV: (formData) => api.post('/admin/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDataset: (id) => api.delete(`/admin/datasets/${id}`),
  trainModels: (datasetId = null) => {
    const url = datasetId ? `/admin/train?dataset_id=${datasetId}` : '/admin/train';
    return api.post(url);
  },
  getModels: () => api.get('/admin/models'),
  activateModel: (id) => api.post(`/admin/models/${id}/activate`)
};

export const predictionAPI = {
  predict: (inputData, modelName = null) => {
    const url = modelName ? `/predict?model_name=${modelName}` : '/predict';
    return api.post(url, inputData);
  },
  predictRoute: (routeData, modelName = null) => {
    const url = modelName ? `/predict/route?model_name=${modelName}` : '/predict/route';
    return api.post(url, routeData);
  }
};

export const reportsAPI = {
  getCSVUrl: () => `${API_URL}/reports/csv?token=${localStorage.getItem('token')}`,
  getExcelUrl: () => `${API_URL}/reports/excel?token=${localStorage.getItem('token')}`,
  getPDFUrl: () => `${API_URL}/reports/pdf?token=${localStorage.getItem('token')}`
};

