import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';

/*************** MINUTE ***************/

// 분(Minute) 캔들 request 모델
export interface MinuteCandleRequestModel {
  unit: 1 | 3 | 5 | 15 | 10 | 30 | 60 | 240; // 분 단위
  market: string; // 종목코드 (ex. KRW-BTC)
  to?: string; // 마지막 캔들 시각 (exclusive). 포맷 : yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss. 비워서 요청시 가장 최근 캔들
  count?: number; // 캔들 개수(최대 200개까지 요청 가능)
}
// 분(Minute) 캔들 response 모델
export interface MinuteCandleModel {
  market: string; // 종목코드
  candle_date_time_utc: string; // 캔들 기준 시각(UTC 기준)
  candle_date_time_kst: string; // 캔들 기준 시각(KST 기준)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 해당 캔들에서 마지막 틱이 저장된 시각
  candle_acc_trade_price: number; // 누적 거래 금액
  candle_acc_trade_volume: number; // 누적 거래량
  unit: number; // 분 단위(유닛)
}

/*************** DAY ***************/

// 일(Day) 캔들 request 모델
export interface DayCandleRequestModel {
  market: string; // 코인명 (ex. KRW-BTC)
  to?: string; // 마지막 캔들 시각 (exclusive). 포맷 : yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss. 비워서 요청시 가장 최근 캔들
  count?: number; // 캔들 개수
  convertingPriceUnit?: string; // 종가 환산 화폐 단위 (생략 가능, KRW로 명시할 시 원화 환산 가격을 반환.)
}
// 일(Day) 캔들 response 모델
export interface DayCandleModel {
  market: string; // 코인명
  candle_date_time_utc: string; // 캔들 기준 시각(UTC 기준)
  candle_date_time_kst: string; // 캔들 기준 시각(KST 기준)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 해당 캔들에서 마지막 틱이 저장된 시각
  candle_acc_trade_price: number; // 누적 거래 금액
  candle_acc_trade_volume: number; // 누적 거래량
  prev_closing_price: number; // 전일 종가(UTC 0시 기준)
  change_price: number; // 전일 종가 대비 변화 금액
  change_rate: number; // 전일 종가 대비 변화량
  converted_trade_price: number; // 종가 환산 화폐 단위로 환산된 가격(요청에 convertingPriceUnit 파라미터 없을 시 해당 필드 포함되지 않음.)
}

/*************** WEEK ***************/

// 주(Week) 캔들 request 모델
export interface WeekCandleRequestModel {
  market: string; // 코인명 (ex. KRW-BTC)
  to?: string; // 마지막 캔들 시각 (exclusive). 포맷 : yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss. 비워서 요청시 가장 최근 캔들
  count?: number; // 캔들 개수
}
// 주(Week) 캔들 response 모델
export interface WeekCandleModel {
  market: string; // 코인명
  candle_date_time_utc: string; // 캔들 기준 시각(UTC 기준)
  candle_date_time_kst: string; // 캔들 기준 시각(KST 기준)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 해당 캔들에서 마지막 틱이 저장된 시각
  candle_acc_trade_price: number; // 누적 거래 금액
  candle_acc_trade_volume: number; // 누적 거래량
  first_day_of_period: string; // 캔들 기간의 가장 첫 날
}

/*************** MONTH ***************/

// 월(Month) 캔들 request 모델
export interface MonthCandleRequestModel {
  market: string; // 코인명 (ex. KRW-BTC)
  to?: string; // 마지막 캔들 시각 (exclusive). 포맷 : yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss. 비워서 요청시 가장 최근 캔들
  count?: number; // 캔들 개수
}
// 월(Month) 캔들 response 모델
export interface MonthCandleModel {
  market: string; // 코인명
  candle_date_time_utc: string; // 캔들 기준 시각(UTC 기준)
  candle_date_time_kst: string; // 캔들 기준 시각(KST 기준)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 해당 캔들에서 마지막 틱이 저장된 시각
  candle_acc_trade_price: number; // 누적 거래 금액
  candle_acc_trade_volume: number; // 누적 거래량
  first_day_of_period: string; // 캔들 기간의 가장 첫 날
}

export interface CandleServiceModel {
  getMinuteCandles: (
    data: MinuteCandleRequestModel,
  ) => Promise<MinuteCandleModel[]>;
  getDayCandles: (data: DayCandleRequestModel) => Promise<DayCandleModel[]>;
  getWeekCandles: (data: WeekCandleRequestModel) => Promise<WeekCandleModel[]>;
  getMonthCandles: (
    data: MonthCandleRequestModel,
  ) => Promise<MonthCandleModel[]>;
}

export default class CandleService implements CandleServiceModel {
  /**
   * 분(Minute) 캔들 조회
   * @param data
   * @returns 분 캔들 목록
   */
  async getMinuteCandles(
    data: MinuteCandleRequestModel,
  ): Promise<MinuteCandleModel[]> {
    try {
      const res = await publicAPI.get(`/candles/minutes/${data.unit}`, {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'CandleService',
        sub: 'getMinuteCandles',
        data: { error },
      });
      throw error;
    }
  }

  /**
   * 일(Day) 캔들 조회
   * @param data
   * @returns 일 캔들 목록
   */
  async getDayCandles(data: DayCandleRequestModel): Promise<DayCandleModel[]> {
    try {
      const res = await publicAPI.get('/candles/days', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'CandleService',
        sub: 'getDayCandles',
        data: { error },
      });
      throw error;
    }
  }

  /**
   * 주(Week) 캔들 조회
   * @param data
   * @returns 주 캔들 목록
   */
  async getWeekCandles(
    data: WeekCandleRequestModel,
  ): Promise<WeekCandleModel[]> {
    try {
      const res = await publicAPI.get('/candles/weeks', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'CandleService',
        sub: 'getWeekCandles',
        data: { error },
      });
      throw error;
    }
  }

  /**
   * 월(Month) 캔들 조회
   * @param data
   * @returns 월 캔들 목록
   */
  async getMonthCandles(
    data: MonthCandleRequestModel,
  ): Promise<MonthCandleModel[]> {
    try {
      const res = await publicAPI.get('/candles/months', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'CandleService',
        sub: 'getMonthCandles',
        data: { error },
      });
      throw error;
    }
  }
}
