import 'module-alias/register';
import 'dotenv/config';
import http from 'http';

import logger from '@src/config/winston';
import Worker from '@src/worker';
import errorHandler from '@src/utils/errorHandler';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, async () => {
  try {
    logger.info(`Server running at http://${hostname}:${port}/`);

    const worker = new Worker('KRW'); // 원화마켓 워커 생성
    worker.start();
  } catch (error) {
    errorHandler(error, { main: 'App' });
  }
});
