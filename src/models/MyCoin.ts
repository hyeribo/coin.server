import logger from '@src/config/winston';

export interface MyCoinModel {
  currency: string; // 화폐를 의미하는 영문 대문자 코드
  balance: number; // 주문가능 금액/수량
  locked: number; // 주문 중 묶여있는 금액/수량
  avg_buy_price: number; // 매수평균가
  avg_buy_price_modified: number; // 매수평균가 수정 여부
  unit_currency: string; // 평단가 기준 화폐

  last_trade_datetime: string; // 최근 체결 시각
}

export class MyCoin implements MyCoinModel {
  currency = '';
  balance = 0;
  locked = 0;
  avg_buy_price = 0;
  avg_buy_price_modified = 0;
  unit_currency = '';

  last_trade_datetime = '';

  constructor(obj: MyCoinModel) {
    this.currency = obj.currency;
    this.balance = obj.balance;
    this.locked = obj.locked;
    this.avg_buy_price = obj.avg_buy_price;
    this.avg_buy_price_modified = obj.avg_buy_price_modified;
    this.unit_currency = obj.unit_currency;
    this.last_trade_datetime = obj.last_trade_datetime;
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
