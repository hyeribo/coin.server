import axios from 'axios';
import { getToken } from '@src/config/jwt';

const UPBIT_API_URL = process.env.UPBIT_API_URL || '';

export const privateAPI = axios.create({
  baseURL: UPBIT_API_URL,
  timeout: 5000,
});

privateAPI.interceptors.request.use(
  (request) => {
    // Edit request config
    let requestParams;
    if (request.method === 'get' && request.params) {
      requestParams = request.params;
    } else if (request.method === 'post' && request.data) {
      requestParams = request.data;
    }
    const token = getToken(requestParams);
    request.headers = {
      Authorization: token,
    };

    return request;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const publicAPI = axios.create({
  baseURL: UPBIT_API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// axios.interceptors.response.use(
//   (response) => {
//     // Edit response config
//     return response;
//   },
//   (error) => {
//     return Promise.reject(error);
//   },
// );
