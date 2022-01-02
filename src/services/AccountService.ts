import axios from 'axios';

import logger from '@src/config/winston';
import { getToken } from '@src/config/jwt';
import { MyCoinModel } from '@src/models/MyCoin';

const BASE_URL = process.env.UPBIT_API_URL || '';

export interface AccountServiceInterface {
  getAccountInfo: () => Promise<object[]>;
}

export default class AccountService implements AccountServiceInterface {
  /**
   *
   * @returns
   */
  async getAccountInfo(): Promise<MyCoinModel[]> {
    try {
      const url = BASE_URL + '/v1/accounts';
      const token = getToken();

      const res = await axios.get(url, {
        headers: { Authorization: token },
      });

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
}
