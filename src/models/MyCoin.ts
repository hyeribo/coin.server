import logger from '@src/config/winston';

import WebSocket from '@src/websocket';
import { MyCoinResponseModel } from '@src/services/AccountService';
import { MarketCurrencyType } from '@src/types/common';

export interface MyCoinModel {
  marketCurrency: MarketCurrencyType;
  websocket?: WebSocket;
  setData(data: MyCoinResponseModel): void;
  getData(): MyCoinResponseModel;
  setWebsocket(): void;
}
export default class MyCoin implements MyCoinModel {
  marketCurrency;
  websocket?: WebSocket;

  private currency = '';
  private balance = 0;
  private locked = 0;
  private avg_buy_price = 0;
  private avg_buy_price_modified = false;
  private unit_currency = '';

  constructor(marketCurrency: MarketCurrencyType, obj: MyCoinResponseModel) {
    this.marketCurrency = marketCurrency;

    this.currency = obj.currency;
    this.balance = obj.balance;
    this.locked = obj.locked;
    this.avg_buy_price = obj.avg_buy_price;
    this.avg_buy_price_modified = obj.avg_buy_price_modified;
    this.unit_currency = obj.unit_currency;
  }

  setData(data: MyCoinResponseModel) {
    if (data.currency) {
      this.currency = data.currency;
    }
    if (data.balance) {
      this.balance = data.balance;
    }
    if (data.locked) {
      this.locked = data.locked;
    }
    if (data.avg_buy_price) {
      this.avg_buy_price = data.avg_buy_price;
    }
    if (data.avg_buy_price_modified) {
      this.avg_buy_price_modified = data.avg_buy_price_modified;
    }
    if (data.unit_currency) {
      this.unit_currency = data.unit_currency;
    }
  }

  getData() {
    return {
      currency: this.currency,
      balance: this.balance,
      locked: this.locked,
      avg_buy_price: this.avg_buy_price,
      avg_buy_price_modified: this.avg_buy_price_modified,
      unit_currency: this.unit_currency,
      marketCurrency: this.marketCurrency,
    };
  }

  setWebsocket() {
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
