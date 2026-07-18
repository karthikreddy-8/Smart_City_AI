import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { 
  FaUpload, 
  FaTrashAlt, 
  FaCogs, 
  FaTable, 
  FaUsers, 
  FaPlay, 
  FaCheckCircle, 
  FaTimesCircle 
} from 'react-icons/fa';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  
  const [file, setFile] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [userRes, datasetRes, modelRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getDatasets(),
        adminAPI.getModels()
      ]);
      setUsers(userRes.data);
      setDatasets(datasetRes.data);
      setModels(modelRes.data);
    } catch (err) {
      console.error("Admin Fetch Error", err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStats(null);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAPI.uploadCSV(formData);
      setSuccess('Dataset uploaded and cleaned successfully.');
      setUploadStats(res.data.cleaning_stats);
      setFile(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'CSV upload failed. Verify data format.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDataset = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dataset? All corresponding traffic records will be wiped.")) return;
    try {
      await adminAPI.deleteDataset(id);
      setSuccess("Dataset deleted successfully.");
      fetchAdminData();
    } catch (err) {
      setError("Failed to delete dataset.");
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainingMessage('In-memory model training launched in background. Might take up to a minute...');
    setError('');
    try {
      const res = await adminAPI.trainModels();
      setSuccess(res.data.message);
      // Wait a few seconds to let background tasks start, then refresh model list
      setTimeout(() => fetchAdminData(), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Training failed to execute.');
    } finally {
      setTraining(false);
    }
  };

  const handleActivateModel = async (id) => {
    try {
      await adminAPI.activateModel(id);
      setSuccess("Selected model activated as main predictor.");
      fetchAdminData();
    } catch (err) {
      setError("Failed to activate model.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Alert Notices */}
      {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-semibold">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-semibold">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CSV Drag/Drop & Clean Uploader */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6 lg:col-span-1 transition-colors">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-2">
            <FaUpload className="text-primary-500" />
            <span>CSV Dataset Uploader</span>
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-primary-500 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FaUpload className="mx-auto text-3xl text-slate-400 dark:text-slate-600 mb-3" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {file ? file.name : "Select or drag traffic CSV file"}
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">Supports standard smart city schemas</span>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500 font-bold rounded-2xl flex items-center justify-center space-x-2 text-xs shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50"
            >
              <span>{uploading ? "Uploading & Cleaning..." : "Upload & Auto-Clean Dataset"}</span>
            </button>
          </form>

          {/* Dynamic cleaning stats display */}
          {uploadStats && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-750 space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-350">Data Cleaning Metrics</h4>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <div>Initial Rows: <strong className="text-slate-800 dark:text-white">{uploadStats.initial_rows}</strong></div>
                <div>Duplicates Dropped: <strong className="text-rose-400">{uploadStats.duplicates_removed}</strong></div>
                <div>Values Imputed: <strong className="text-cyan-400">{uploadStats.missing_values_imputed}</strong></div>
                <div>Outliers Handled: <strong className="text-amber-400">{uploadStats.outliers_handled}</strong></div>
                <div>Coords Handled: <strong className="text-violet-400">{uploadStats.invalid_coords_handled}</strong></div>
                <div>Final Cleaned Rows: <strong className="text-emerald-400">{uploadStats.final_rows}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Datasets Control list */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6 lg:col-span-2 transition-colors">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-2">
            <FaTable className="text-cyan-500" />
            <span>Active Datasets</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3">Filename</th>
                  <th className="pb-3">Total Rows</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Uploaded</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {datasets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400 font-semibold">No datasets loaded. Base analytics uses synthetic generators.</td>
                  </tr>
                ) : (
                  datasets.map((dataset) => (
                    <tr key={dataset.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 font-bold text-slate-800 dark:text-white">{dataset.filename}</td>
                      <td className="py-4">{dataset.row_count} rows</td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25">
                          {dataset.status}
                        </span>
                      </td>
                      <td className="py-4">{new Date(dataset.uploaded_at).toLocaleDateString()}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => handleDeleteDataset(dataset.id)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Dataset"
                        >
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Training & Selection Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6 lg:col-span-3 transition-colors">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <FaCogs className="text-violet-500" />
              <span>AI Classifier Training Suite</span>
            </h3>

            <button
              onClick={handleTrain}
              disabled={training}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-primary-500 hover:from-violet-750 hover:to-primary-600 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-violet-500/20 disabled:opacity-50"
            >
              <FaPlay className="text-[10px]" />
              <span>{training ? "Training models..." : "Train Core Models"}</span>
            </button>
          </div>

          {trainingMessage && (
            <p className="text-xs text-amber-500 font-semibold">{trainingMessage}</p>
          )}

          {/* Model Comparisons Table */}
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3">Model Engine</th>
                  <th className="pb-3">Accuracy (R²)</th>
                  <th className="pb-3">Precision</th>
                  <th className="pb-3">Recall</th>
                  <th className="pb-3">F1 Score</th>
                  <th className="pb-3">Trained At</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {models.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-6 text-center text-slate-400 font-semibold">
                      No models trained yet. Inference page uses default mathematical heuristics.
                    </td>
                  </tr>
                ) : (
                  models.map((model) => (
                    <tr key={model.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 font-bold text-slate-800 dark:text-white">{model.model_name}</td>
                      <td className="py-4">{model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : "N/A"}</td>
                      <td className="py-4">{model.precision_score ? `${(model.precision_score * 100).toFixed(1)}%` : "N/A"}</td>
                      <td className="py-4">{model.recall_score ? `${(model.recall_score * 100).toFixed(1)}%` : "N/A"}</td>
                      <td className="py-4">{model.f1_score ? `${(model.f1_score * 100).toFixed(1)}%` : "N/A"}</td>
                      <td className="py-4">{new Date(model.trained_at).toLocaleString()}</td>
                      <td className="py-4">
                        {model.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 flex items-center w-fit space-x-1">
                            <FaCheckCircle />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 flex items-center w-fit space-x-1">
                            <FaTimesCircle />
                            <span>Standby</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        {!model.is_active && (
                          <button
                            onClick={() => handleActivateModel(model.id)}
                            className="px-3 py-1.5 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-lg font-bold text-[10px] transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Management list */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6 lg:col-span-3 transition-colors">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-2">
            <FaUsers className="text-slate-500" />
            <span>Authorized User Registry</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Role Authorization</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 font-bold text-slate-800 dark:text-white">{user.username}</td>
                    <td className="py-4">{user.email}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === 'Admin' ? 'text-cyan-500 bg-cyan-500/10 border border-cyan-500/25' :
                        user.role === 'Traffic Analyst' ? 'text-violet-500 bg-violet-500/10 border border-violet-500/25' :
                        'text-slate-500 bg-slate-500/10 border border-slate-500/25'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-emerald-500 font-semibold flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
