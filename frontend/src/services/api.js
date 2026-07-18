import axios from 'axios';
import { API_URL } from '../contexts/AuthContext';

export const analyticsAPI = {
  getKPIs: (params = {}) => axios.get(`${API_URL}/analytics/kpis`, { params }),
  getCharts: (params = {}) => axios.get(`${API_URL}/analytics/charts`, { params }),
  getMapMarkers: () => axios.get(`${API_URL}/analytics/map-markers`),
  getFilters: () => axios.get(`${API_URL}/analytics/filters`),
  getAreaAnalytics: (params) => axios.get(`${API_URL}/analytics/area`, { params })
};

export const adminAPI = {
  getUsers: () => axios.get(`${API_URL}/admin/users`),
  getDatasets: () => axios.get(`${API_URL}/admin/datasets`),
  uploadCSV: (formData) => axios.post(`${API_URL}/admin/upload-csv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDataset: (id) => axios.delete(`${API_URL}/admin/datasets/${id}`),
  trainModels: (datasetId = null) => {
    const url = datasetId ? `${API_URL}/admin/train?dataset_id=${datasetId}` : `${API_URL}/admin/train`;
    return axios.post(url);
  },
  getModels: () => axios.get(`${API_URL}/admin/models`),
  activateModel: (id) => axios.post(`${API_URL}/admin/models/${id}/activate`)
};

export const predictionAPI = {
  predict: (inputData, modelName = null) => {
    const url = modelName ? `${API_URL}/predict?model_name=${modelName}` : `${API_URL}/predict`;
    return axios.post(url, inputData);
  }
};

export const reportsAPI = {
  getCSVUrl: () => `${API_URL}/reports/csv?token=${localStorage.getItem('token')}`,
  getExcelUrl: () => `${API_URL}/reports/excel?token=${localStorage.getItem('token')}`,
  getPDFUrl: () => `${API_URL}/reports/pdf?token=${localStorage.getItem('token')}`
};
