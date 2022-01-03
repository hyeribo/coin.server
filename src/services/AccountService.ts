import { privateAPI } from '@src/config/axios';

import logger from '@src/config/winston';
import { MyCoinModel } from '@src/models/MyCoin';

export interface AccountServiceModel {
  getAccountInfo: () => Promise<object[]>;
  getMyCoinInfo: (market: string) => Promise<object[]>;
}

export default class AccountService implements AccountServiceModel {
  /**
   * 현재 가지고있는 코인 리스트 가져오기
   * @returns
   */
  async getAccountInfo(): Promise<MyCoinModel[]> {
    try {
      const res = await privateAPI.get('/accounts');

      const coins = (res.data || []).map((obj: any) => ({
        currency: obj.currency,
        balance: +obj.balance,
        locked: +obj.locked,
        avg_buy_price: +obj.avg_buy_price,
        avg_buy_price_modified: obj.avg_buy_price_modified,
        unit_currency: obj.unit_currency,
        last_trade_datetime: '',
      }));

      return coins;
    } catch (error) {
      logger.error('Network error.', {
        main: 'AccountService',
        sub: 'getAccountInfo',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 내가 보유한 종목의 주문 가능 정보
   * @param market 조회할 종목코드
   * @returns 주문 가능 정보
   */
  async getMyCoinInfo(market: string): Promise<object[]> {
    try {
      const res = await privateAPI.get('/orders/chance', {
        params: { market: market },
      });

      logger.info('data.', {
        main: 'AccountService',
        sub: 'getCoinOrderInfo',
        data: res.data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'AccountService',
        sub: 'getCoinOrderInfo',
        data: { error },
      });
      throw error;
    }
  }
}
