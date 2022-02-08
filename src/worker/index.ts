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

  /**
   * 내가 가진 코인들 각각 거래 시작
   */
  startTradeAllCoins() {
    // 내가 가진 모든 코인들 가져오기
    const allCoins = this.account.getCoins();
    // 코인당 할당된 금액 가져오기
    const enableBalancePerCoin = this.account.enableBalancePerCoin;

    // 모든 코인 작업 시작
    allCoins.forEach((coin) => {
      coin.startTrade(enableBalancePerCoin);
    });
  }

  async start() {
    try {
      // 내 계정 생성
      this.account = new Account(this.marketCurrency);
      await this.account.init();

      this.startTradeAllCoins();

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

    // 내가 가진 모든 코인들 가져오기
    const allCoins = this.account.getCoins();

    if (allCoins) {
      // 모든 코인 작업 중지
      allCoins.forEach((coin) => {
        if (coin.status === 'started') {
          coin.stopTrade();
        }
      });
    }

    logger.verbose('Worker stopped.', {
      main: 'Worker',
      data: { status: this.status },
    });
  }
}
