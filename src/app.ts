import 'module-alias/register';
import 'dotenv/config';
import http from 'http';

import logger from '@src/config/winston';
import Account from '@src/models/Account';
import Market from '@src/models/Market';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, async () => {
  logger.info(`Server running at http://${hostname}:${port}/`);

  const myAccount = new Account();
  await myAccount.init();

  const kMarket = new Market('KRW'); // 원화마켓
  await kMarket.init();
});
