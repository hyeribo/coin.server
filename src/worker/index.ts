import logger from '@src/config/winston';

import Account from '@src/models/Account';
import WebSocket from '@src/websocket';
import MarketWatcher from '@src/websocket/MarketWatcher';

import errorHandler from '@src/utils/errorHandler';

import { MarketCurrencyType } from '@src/types/common';

export default class Worker {
  private status: 'start' | 'stop' = 'start';
  marketCurrency: MarketCurrencyType; // 단위 화폐
  account!: Account; // 계정 인스턴스
  marketWatcher!: MarketWatcher;

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

      // 계정이 가진 코인들에 각각 웹소켓 연결
      // this.connectWebSocketToMyCoins();

      // 시장 감시자 생성
      // this.marketWatcher = new MarketWatcher(this.marketCurrency);
      // await this.marketWatcher.init();
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

  /**
   * 내가 가진 코인들을 각각 웹소켓에 연결
   */
  connectWebSocketToMyCoins() {
    // 내가 가진 모든 코인들 가져오기
    const allCoins = this.account.getCoins();
    console.log('allCoins', allCoins);
    // 웹소켓 연결
    allCoins.forEach((coin) => {
      coin.setWebsocket();
    });
  }
}
