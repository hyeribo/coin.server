import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import queryString from 'query-string';
import { v4 as uuid } from 'uuid';
import logger from '@src/config/winston';

// 업비트 API access key
const accessKey = process.env.UPBIT_ACCESS_KEY || '';
// 업비트 API secret key
const secretKey = process.env.UPBIT_SECRET_KEY || '';
// 업비트 API request 쿼리 해싱 알고리즘
const queryHashAlg = process.env.UPBIT_QUERY_HASH_ALG || '';

interface payloadModel {
  access_key: string;
  nonce: string;
  query_hash?: string;
  query_hash_alg?: string;
}

export const getToken = function (params?: object) {
  const payload: payloadModel = {
    access_key: accessKey,
    nonce: uuid(),
  };

  // 파라미터가 있는 경우, 쿼리 스트링 해싱
  if (params) {
    const query = queryString.stringify(params);

    const hash = crypto.createHash(queryHashAlg);
    const queryHash = hash.update(query, 'utf-8').digest('hex');

    payload.query_hash = queryHash;
    payload.query_hash_alg = queryHashAlg.toUpperCase();
  }

  const jwtToken = jwt.sign(payload, secretKey);
  const authorizationToken = `Bearer ${jwtToken}`;

  logger.info('Token generated.');

  return authorizationToken;
};
