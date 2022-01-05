import logger from '@src/config/winston';

import Account from '@src/models/Account';
import WebSocket from '@src/websocket';

import constant from '@src/config/constants';
import errorHandler from '@src/utils/errorHandler';

import { MarketCurrencyType } from '@src/types/common';

export default class Worker {
  marketCurrency: MarketCurrencyType; // 단위 화폐
  account!: Account;
  private status: 'start' | 'stop' = 'start';

  constructor(marketCurrency: MarketCurrencyType) {
    if (!marketCurrency) {
      throw new Error('marketCurrency not provided.');
    }
    this.marketCurrency = marketCurrency;
  }

  async start() {
    try {
      // 내 계정 생성
      this.account = new Account(this.marketCurrency);
      await this.account.init();

      // 계정이 가진 금액이 거래 가능한 금액 이상인지 확인
      const checkTradable = this.account.checkTradable();
      if (!checkTradable) {
        throw new Error('Not enough balance to trade.');
      }

      // 계정이 가진 코인들에 각각 웹소켓 연결
      this.connectWebSocketToAllCoins();
    } catch (error) {
      errorHandler(error, { main: 'Worker', sub: 'init' });
      this.stop();
    }
  }

  async stop() {
    this.status = 'stop';
    logger.verbose('Worker stopped.', {
      main: 'Worker',
      data: { status: this.status },
    });
  }

  connectWebSocketToAllCoins() {
    const allCoins = this.account.getCoins();
    console.log('allCoins', allCoins);
    allCoins.forEach((coin) => {
      coin.setWorker();
    });
  }
}
