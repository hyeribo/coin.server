import fetch from 'node-fetch';
import { getToken } from '@src/config/jwt';

const UPBIT_API_URL = process.env.UPBIT_API_URL || '';

export async function fetchPost(url: string, params: object = {}) {
  const token = getToken(params);
  const response = await fetch(UPBIT_API_URL + url, {
    method: 'post',
    body: JSON.stringify(params),
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
  const data = await response.json();
  return data;
}
