import 'module-alias/register';
import http from 'http';
import 'dotenv/config';

import logger from '@src/config/winston';
import Account from '@src/models/Account';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  logger.info(`Server running at http://${hostname}:${port}/`);

  const myAccount = new Account();
  myAccount.init();
});
