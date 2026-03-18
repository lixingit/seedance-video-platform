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

export default api;
