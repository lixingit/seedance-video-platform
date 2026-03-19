/**
 * API 服务
 */
import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// 获取当前用户名
export const getUsername = () => {
  return localStorage.getItem('seedance_username') || '';
};

// 设置用户名
export const setUsername = (username) => {
  localStorage.setItem('seedance_username', username);
};

// 通用请求参数（添加 username）
const withUsername = (params = {}) => {
  const username = getUsername();
  return { ...params, username };
};

// ========== 用户 API ==========

export const createUser = async (username) => {
  const response = await api.post('/users', { username });
  return response.data;
};

// ========== 视频任务 API ==========

export const createVideoTask = async (data) => {
  const response = await api.post('/videos', data, {
    params: withUsername(),
  });
  return response.data;
};

export const listTasks = async (params = {}) => {
  const response = await api.get('/videos', {
    params: withUsername(params),
  });
  return response.data;
};

export const getTask = async (taskId) => {
  const response = await api.get(`/videos/${taskId}`, {
    params: withUsername(),
  });
  return response.data;
};

export const refreshTask = async (taskId) => {
  const response = await api.post(`/videos/${taskId}/refresh`, null, {
    params: withUsername(),
  });
  return response.data;
};

export const updateTaskTags = async (taskId, tags) => {
  const response = await api.put(`/videos/${taskId}/tags`, { tags }, {
    params: withUsername(),
  });
  return response.data;
};

export const updateTaskNotes = async (taskId, notes) => {
  const response = await api.put(`/videos/${taskId}/notes`, { notes }, {
    params: withUsername(),
  });
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/videos/${taskId}`, {
    params: withUsername(),
  });
  return response.data;
};


// ========== 图片 API ==========

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/images/upload', formData, {
    params: withUsername(),
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return response.data;
};

export const generateImages = async (data) => {
  const response = await api.post('/images/generate', data, {
    params: withUsername(),
    timeout: 120000,
  });
  return response.data;
};

// ========== 素材 API ==========

export const listAssets = async (params = {}) => {
  const response = await api.get('/assets', {
    params: withUsername(params),
  });
  return response.data;
};

export const getAsset = async (assetId) => {
  const response = await api.get(`/assets/${assetId}`, {
    params: withUsername(),
  });
  return response.data;
};

export const updateAsset = async (assetId, data) => {
  const response = await api.put(`/assets/${assetId}`, data, {
    params: withUsername(),
  });
  return response.data;
};

export const deleteAsset = async (assetId) => {
  const response = await api.delete(`/assets/${assetId}`, {
    params: withUsername(),
  });
  return response.data;
};

export const createPromptTemplate = async (data) => {
  const response = await api.post('/assets/prompt-template', data, {
    params: withUsername(),
  });
  return response.data;
};

export default api;

