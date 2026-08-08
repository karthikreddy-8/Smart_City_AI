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

export const liveTrafficAPI = {
  getCameras: (lat, lng) => {
    const params = {};
    if (lat && lng) {
      params.latitude = lat;
      params.longitude = lng;
    }
    return api.get('/live-traffic/cameras', { params });
  },
  detect: (data) => api.post('/live-traffic/detect', data),
  getHistorical: (period = '24h', cameraId = null) => {
    const params = { period };
    if (cameraId) params.camera_id = cameraId;
    return api.get('/live-traffic/historical', { params });
  },
  getPrediction: () => api.get('/live-traffic/prediction'),
  getRoute: (originLat, originLng, destLat, destLng) => api.get('/live-traffic/route', {
    params: { origin_lat: originLat, origin_lng: originLng, dest_lat: destLat, dest_lng: destLng }
  }),
  getWeather: (lat, lng) => api.get('/live-traffic/weather', { params: { latitude: lat, longitude: lng } }),
  getCamera: (cameraId) => api.get(`/live-traffic/cameras/${cameraId}`),
  getNearestCamera: (lat, lng, maxDistanceKm = 50.0) => api.get('/live-traffic/nearest', { params: { latitude: lat, longitude: lng, max_distance_km: maxDistanceKm } }),
  reverseGeocode: (lat, lng) => api.get('/live-traffic/reverse-geocode', { params: { latitude: lat, longitude: lng } }),
  getAreaAnalysis: (lat, lng, accuracy = 15.0) => api.get('/live-traffic/area-analysis', { params: { latitude: lat, longitude: lng, accuracy_meters: accuracy } }),
  getLocations: () => api.get('/live-traffic/locations'),
  getAreaQuery: (area, city, state, country) => api.get('/live-traffic/area-query', { params: { area, city, state, country } }),
};


