// const http = require("http");
// require("dotenv").config();

// const { logger } = require("./config/winston");

const AccountController = require('./controllers/AccountController');
const MarketController = require('./controllers/MarketController');

const MyAccount = require('./models/MyAccount'); // 내 계좌 정보

const hostname = '127.0.0.1';
const port = 3000;

const myAccount = new MyAccount();

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, async () => {
  logger.info(`Server running at http://${hostname}:${port}/`);

  const account = await AccountController.getMyAccount();
  myAccount.init(account);
});
