import logger from '@src/config/winston';

import WebSocket from '@src/websocket';
import { MyCoinResponseModel } from '@src/services/AccountService';
import { MarketCurrencyType } from '@src/types/common';

export interface MyCoinModel {
  websocket?: WebSocket;
  setWebsocket(): void;
  setData(data: MyCoinResponseModel): void;
  getData(): MyCoinResponseModel;
}
export default class MyCoin implements MyCoinModel {
  websocket?: WebSocket; // 웹소켓 객체

  private symbol;
  private balance;
  private locked;
  private avgBuyPrice;
  private avgBuyPriceModified;
  private marketCurrency;

  constructor(obj: MyCoinResponseModel) {
    this.symbol = obj.symbol;
    this.balance = obj.balance;
    this.locked = obj.locked;
    this.avgBuyPrice = obj.avgBuyPrice;
    this.avgBuyPriceModified = obj.avgBuyPriceModified;
    this.marketCurrency = obj.marketCurrency;
  }

  /**
   * 웹소켓 연결하기
   */
  setWebsocket() {
    this.websocket = new WebSocket(this.marketCurrency, this.symbol);
    this.websocket.connect();
  }

  /**
   * 데이터 세팅하기
   * @param data
   */
  setData(data: MyCoinResponseModel) {
    if (data.symbol) {
      this.symbol = data.symbol;
    }
    if (data.balance) {
      this.balance = data.balance;
    }
    if (data.locked) {
      this.locked = data.locked;
    }
    if (data.avgBuyPrice) {
      this.avgBuyPrice = data.avgBuyPrice;
    }
    if (data.avgBuyPriceModified) {
      this.avgBuyPriceModified = data.avgBuyPriceModified;
    }
    if (data.marketCurrency) {
      this.marketCurrency = data.marketCurrency;
    }
  }

  /**
   * 데이터 가져오기
   * @returns
   */
  getData() {
    return {
      symbol: this.symbol,
      balance: this.balance,
      locked: this.locked,
      avgBuyPrice: this.avgBuyPrice,
      avgBuyPriceModified: this.avgBuyPriceModified,
      marketCurrency: this.marketCurrency,
    };
  }

  /**
   * TODO: 매도 주문 걸기
   * @param price 매도 단가
   * @param amount 매도 수량
   * @returns 성공여부
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
}
