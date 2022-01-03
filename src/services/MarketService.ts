import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';
import { MarketCurrencyType, MarketCoinModel } from '@src/models/Market';

export interface MarketServiceModel {
  getAllCoins: (marketCode: MarketCurrencyType) => Promise<MarketCoinModel[]>;
}

export default class MarketService implements MarketServiceModel {
  /**
   * 특정 마켓의 모든 코인 가져오기 (marketCode 없으면 전체 마켓의 코인 리턴)
   * @param marketCode 마켓 코드
   * @returns
   */
  async getAllCoins(
    marketCode?: MarketCurrencyType,
  ): Promise<MarketCoinModel[]> {
    try {
      const res = await publicAPI.get('/market/all', {
        params: { isDetails: true },
      });

      let coins = res.data || [];
      if (marketCode) {
        coins = coins.filter((coin: any) => coin.market.startsWith(marketCode));
      }

      return coins;
    } catch (error) {
      logger.error('error.', {
        main: 'MarketService',
        sub: 'getAllCoins',
        data: { error },
      });
      throw error;
    }
  }
}
