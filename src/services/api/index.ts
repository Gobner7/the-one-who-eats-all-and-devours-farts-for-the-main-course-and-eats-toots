import axios from 'axios';
import { config } from '../../config';

const api = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const serializeError = (error: unknown): string => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }
  return String(error);
};

export const handleApiError = (error: unknown) => {
  const serializedError = serializeError(error);
  console.error('API Error:', serializedError);
  throw new Error(typeof serializedError === 'string' ? serializedError : JSON.stringify(serializedError));
};

export const apiService = {
  async get<T>(url: string) {
    try {
      const response = await api.get<T>(url);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async post<T>(url: string, data: unknown) {
    try {
      const response = await api.post<T>(url, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};