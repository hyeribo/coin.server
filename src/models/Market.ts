import logger from '@src/config/winston';
import MarketService from '@src/services/MarketService';
import { MarketCurrencyType, MarketWarningType } from '@src/types/common';

const marketService = new MarketService();

type MarketStatusType = 'loading' | 'loaded' | 'failed';

export interface MarketCoinModel {
  market: string; // 업비트에서 제공중인 시장 정보
  korean_name: string; // 거래 대상 암호화폐 한글명
  english_name: string; // 거래 대상 암호화폐 영문명
  market_warning: MarketWarningType; // 유의 종목 여부
}

interface MarketModel {
  status: MarketStatusType; // 상태
  code: MarketCurrencyType; // 마켓 코드 (KRW: 원화마켓, BTC: 비트코인마켓)
  coins: MarketCoinModel[]; // 마켓별 코인 전체 리스트
}

export default class Market implements MarketModel {
  status: MarketStatusType = 'loading';
  code: MarketCurrencyType = 'KRW';
  coins: MarketCoinModel[] = [];

  constructor(code?: MarketCurrencyType) {
    if (code) {
      this.code = code;
    }
  }

  /**
   * 초기 세팅
   */
  async init(): Promise<void> {
    try {
      this.setStatus('loading');

      const coins: MarketCoinModel[] = await marketService.getAllCoins(
        this.code,
      );

      // 투자유의종목이 아닌 코인들만 필터처리
      const safeCoins = coins.filter((coin) => coin.market_warning === 'NONE');
      this.coins = safeCoins;

      logger.info(`${this.code} market initialized.`, {
        main: 'Market',
        sub: 'init',
        data: { count: this.coins.length },
      });
      logger.verbose(`${this.code} market's coins.`, {
        main: 'Market',
        sub: 'init',
        data: { coins: this.coins },
      });
      this.setStatus('loaded');
    } catch (error) {
      logger.error(`${this.code} market initialization failed.`, {
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
