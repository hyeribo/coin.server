import logger from '@src/config/winston';

import WebSocket from '@src/websocket';
import { MyCoinResponseModel } from '@src/services/AccountService';
import { MarketCurrencyType } from '@src/types/common';

interface MyCoinModel extends MyCoinResponseModel {
  marketCurrency: MarketCurrencyType;
  websocket?: WebSocket;
}
export default class MyCoin implements MyCoinModel {
  currency = '';
  balance = 0;
  locked = 0;
  avg_buy_price = 0;
  avg_buy_price_modified = 0;
  unit_currency = '';

  marketCurrency;
  websocket?: WebSocket;

  constructor(marketCurrency: MarketCurrencyType, obj: MyCoinResponseModel) {
    this.marketCurrency = marketCurrency;

    this.currency = obj.currency;
    this.balance = obj.balance;
    this.locked = obj.locked;
    this.avg_buy_price = obj.avg_buy_price;
    this.avg_buy_price_modified = obj.avg_buy_price_modified;
    this.unit_currency = obj.unit_currency;
  }

  setWorker() {
    this.websocket = new WebSocket(this.marketCurrency, this.currency);
    this.websocket.connect();
  }

  /**
   * 매도 주문 걸기
   * @param price 매도 단가
   * @param amount 매도 수량
   * @returns
   */
  orderSell(price: number, amount: number): boolean {
    try {
      logger.info('Sell order successed.', {
        main: 'MyCoin',
        sub: 'orderSell',
        data: { price: price, amount: amount },
      });

      return true;
    } catch (error) {
      logger.error('Sell order failed.', {
        main: 'Account',
        sub: 'init',
        data: error,
      });
      return false;
    }
  }

  /**
   * 주문가능 금액/수량 세팅
   * @param balance
   * @returns
   */
  setBalance(balance: number): void {
    this.balance = balance;

    logger.info('Set balance.', {
      main: 'MyCoin',
      sub: 'setBalance',
      data: this,
    });
  }
}
