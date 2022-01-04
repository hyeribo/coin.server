import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';

import { OrderSideType } from '@src/types/common';

// 최근 체결 내역 request 모델
export interface TradeTickRequestModel {
  market: string; // 종목코드 (ex. KRW-BTC)
  to?: string; // 마지막 체결 시각. 형식 : [HHmmss 또는 HH:mm:ss]. 비워서 요청시 가장 최근 데이터
  count?: number; // 체결 개수
  cursor?: string; // 페이지네이션 커서 (sequentialId)
  daysAgo?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 최근 체결 날짜 기준 7일 이내의 이전 데이터 조회 가능. 비워서 요청 시 가장 최근 체결 날짜 반환. (범위: 1 ~ 7)
}

// 최근 체결 내역 response 모델
export interface TradeTickModel {
  trade_date_utc: string; // 체결 일자(UTC 기준)
  trade_time_utc: string; // 체결 시각(UTC 기준)
  timestamp: number; // 체결 타임스탬프
  trade_price: number; // 체결 가격
  trade_volume: number; // 체결량
  prev_closing_price: number; // 전일 종가
  change_price: number; // 변화량
  ask_bid: OrderSideType; // 매도/매수
  sequential_id: number; // 체결 번호(Unique)
}

export interface TradeServiceModel {
  getTradeTicks: (data: TradeTickRequestModel) => Promise<TradeTickModel[]>;
}

export default class TradeService implements TradeServiceModel {
  /**
   * 최근 체결 내역 조회
   * @param data
   * @returns 최근 체결 내역
   */
  async getTradeTicks(data: TradeTickRequestModel): Promise<TradeTickModel[]> {
    try {
      const res = await publicAPI.get('/trades/ticks', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'TradeService',
        sub: 'getTradeTicks',
        data: { error },
      });
      throw error;
    }
  }
}
