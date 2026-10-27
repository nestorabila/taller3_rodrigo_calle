// src/services/InterceptorService.ts
import axios from "axios";
import { TokenService } from "./TokenService";


export const setupInterceptor = () => {
  axios.interceptors.request.use((config) => {
    const token = TokenService.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
};