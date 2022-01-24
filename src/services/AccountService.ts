import { privateAPI } from '@src/config/axios';
import logger from '@src/config/winston';

import constant from '@src/config/constants';

const { EXCLUDE_COINS } = constant;

export interface MyCoinResponseModel {
  currency: string; // 화폐를 의미하는 영문 대문자 코드
  balance: number; // 주문가능 금액/수량
  locked: number; // 주문 중 묶여있는 금액/수량
  avg_buy_price: number; // 매수평균가
  avg_buy_price_modified: boolean; // 매수평균가 수정 여부
  unit_currency: string; // 평단가 기준 화폐
}

interface AccountServiceModel {
  getAccountInfo: () => Promise<object[]>;
}

export default class AccountService implements AccountServiceModel {
  /**
   * 현재 가지고있는 코인 리스트 가져오기
   * @returns
   */
  async getAccountInfo(): Promise<MyCoinResponseModel[]> {
    try {
      const res = await privateAPI.get('/accounts');

      const coins = (res.data || []).map((obj: any) => ({
        currency: obj.currency,
        balance: +obj.balance,
        locked: +obj.locked,
        avg_buy_price: +obj.avg_buy_price,
        avg_buy_price_modified: obj.avg_buy_price_modified,
        unit_currency: obj.unit_currency,
      }));

      const filteredCoins = coins.filter(
        (coin: MyCoinResponseModel) => !EXCLUDE_COINS.includes(coin.currency),
      );
      return filteredCoins;
    } catch (error) {
      logger.error('Network error.', {
        main: 'AccountService',
        sub: 'getAccountInfo',
        data: error,
      });
      throw error;
    }
  }
}
