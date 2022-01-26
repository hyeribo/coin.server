import { privateAPI } from '@src/config/axios';
import logger from '@src/config/winston';

import { MarketCurrencyType } from '@src/types/common';
import config from '@src/config';

const { EXCLUDE_COINS } = config;

export interface MyCoinResponseModel {
  symbol: string; // 화폐를 의미하는 영문 대문자 코드
  balance: number; // 주문가능 금액/수량
  locked: number; // 주문 중 묶여있는 금액/수량
  avgBuyPrice: number; // 매수평균가
  avgBuyPriceModified: boolean; // 매수평균가 수정 여부
  marketCurrency: MarketCurrencyType; // 평단가 기준 화폐
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

      let coins = (res.data || []).map((obj: any) => ({
        symbol: obj.currency,
        balance: +obj.balance,
        locked: +obj.locked,
        avgBuyPrice: +obj.avg_buy_price,
        avgBuyPriceModified: obj.avg_buy_price_modified,
        marketCurrency: obj.unit_currency,
      }));

      coins = coins.filter(
        (coin: MyCoinResponseModel) => !EXCLUDE_COINS.includes(coin.symbol),
      );
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
}
