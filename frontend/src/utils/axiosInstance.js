import axios from "axios";
import { API_PATHS } from "./apiPaths.js";
import { ENV } from "./env.js";


const axiosInstance = axios.create({
  baseURL: ENV.BACKEND_URL,
  withCredentials: true, 
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;
    
  
    if (
      originalRequest.url.includes(API_PATHS.AUTH.GITHUB_LOGIN) || 
      originalRequest.url.includes(API_PATHS.AUTH.GITHUB_CALLBACK)
    ) {
       return Promise.reject(error);
    }
    
    
    if (originalRequest.url.includes(API_PATHS.AUTH.REFRESH)) {
       return Promise.reject(error);  
    }
    

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await axiosInstance.post(API_PATHS.AUTH.REFRESH);
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
