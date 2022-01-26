import logger from '@src/config/winston';
import MarketService, {
  MarketCoinResponseModel,
} from '@src/services/MarketService';
import { MarketCurrencyType } from '@src/types/common';

const marketService = new MarketService();

type MarketStatusType = 'loading' | 'loaded' | 'failed';

interface MarketModel {
  status: MarketStatusType; // 상태
  symbol: MarketCurrencyType; // 마켓 코드 (KRW: 원화마켓, BTC: 비트코인마켓)
  coins: MarketCoinResponseModel[]; // 마켓별 코인 전체 리스트
}

export default class Market implements MarketModel {
  status: MarketStatusType = 'loading';
  symbol: MarketCurrencyType = 'KRW';
  coins: MarketCoinResponseModel[] = [];

  constructor(symbol?: MarketCurrencyType) {
    if (symbol) {
      this.symbol = symbol;
    }
  }

  /**
   * 초기 세팅
   */
  async init(): Promise<void> {
    try {
      this.setStatus('loading');

      const coins: MarketCoinResponseModel[] = await marketService.getAllCoins(
        this.symbol,
      );

      // 투자유의종목이 아닌 코인들만 필터처리
      const safeCoins = coins.filter((coin) => coin.market_warning === 'NONE');
      this.coins = safeCoins;

      logger.info(`${this.symbol} market initialized.`, {
        main: 'Market',
        sub: 'init',
        data: { count: this.coins.length },
      });
      logger.verbose(`${this.symbol} market's coins.`, {
        main: 'Market',
        sub: 'init',
        data: { coins: this.coins },
      });
      this.setStatus('loaded');
    } catch (error) {
      logger.error(`${this.symbol} market initialization failed.`, {
        main: 'Market',
        sub: 'init',
        data: error,
      });

      this.setStatus('failed');
    }
  }

  /**
   * 마켓 상태 세팅
   * @param status 마켓 상태
   */
  setStatus(status: MarketStatusType) {
    this.status = status;

    logger.verbose("Set market's status.", {
      main: 'Market',
      sub: 'setStatus',
      data: { status: this.status },
    });
  }
}
