import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';
import { MarketCurrencyType, MarketWarningType } from '@src/types/common';

export interface MarketCoinResponseModel {
  market: string; // 업비트에서 제공중인 시장 정보
  korean_name: string; // 거래 대상 암호화폐 한글명
  english_name: string; // 거래 대상 암호화폐 영문명
  market_warning: MarketWarningType; // 유의 종목 여부
}

export interface MarketServiceModel {
  getAllCoins: (
    marketCurrency: MarketCurrencyType,
  ) => Promise<MarketCoinResponseModel[]>;
}

export default class MarketService implements MarketServiceModel {
  /**
   * 특정 마켓의 모든 코인 가져오기 (marketCurrency 없으면 전체 마켓의 코인 리턴)
   * @param marketCurrency 마켓 코드
   * @returns
   */
  async getAllCoins(
    marketCurrency?: MarketCurrencyType,
  ): Promise<MarketCoinResponseModel[]> {
    try {
      const res = await publicAPI.get('/market/all', {
        params: { isDetails: true },
      });

      let coins = res.data || [];
      if (marketCurrency) {
        coins = coins.filter((coin: any) =>
          coin.market.startsWith(marketCurrency),
        );
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
