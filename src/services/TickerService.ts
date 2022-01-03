import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';

export type TickerChangeType = 'EVEN' | 'RISE' | 'FALL'; // EVEN: 보합 / RISE: 상승 / FALL: 하락

// 현재가 request 모델
export interface TickerRequestModel {
  markets: string; // 종목코드 목록 (ex. KRW-BTC,BTC-ETH)
}

// 현재가 response 모델
export interface TickerModel {
  market: string; // 종목코드
  trade_date: string; // 최근 거래 일자(UTC)
  trade_time: string; // 최근 거래 시각(UTC)
  trade_date_kst: string; // 최근 거래 일자(KST)
  trade_time_kst: string; // 최근 거래 시각(KST)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  prev_closing_price: number; // 전일 종가
  change: TickerChangeType; // 변화
  change_price: number; // 변화액의 절대값
  change_rate: number; // 변화율의 절대값
  signed_change_price: number; // 부호가 있는 변화액
  signed_change_rate: number; // 부호가 있는 변화율
  trade_volume: number; // 가장 최근 거래량
  acc_trade_price: number; // 누적 거래대금(UTC 0시 기준)
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  acc_trade_volume: number; // 누적 거래량(UTC 0시 기준)
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  highest_52_week_price: number; // 52주 신고가
  highest_52_week_date: string; // 52주 신고가 달성일
  lowest_52_week_price: number; // 52주 신저가
  lowest_52_week_date: string; // 52주 신저가 달성일
  timestamp: number; // 타임스탬프
}

export interface TickerServiceModel {
  getTickers: (data: TickerRequestModel) => Promise<TickerModel[]>;
}

export default class TickerService implements TickerServiceModel {
  /**
   * 현재가 조회
   * @param data
   * @returns 현재가
   */
  async getTickers(data: TickerRequestModel): Promise<TickerModel[]> {
    try {
      const res = await publicAPI.get('/ticker', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'TickerService',
        sub: 'getTickers',
        data: { error },
      });
      throw error;
    }
  }
}
