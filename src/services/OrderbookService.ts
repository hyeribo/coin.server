import { publicAPI } from '@src/config/axios';
import logger from '@src/config/winston';

// 호가 정보 request 모델
export interface OrderbookRequestModel {
  markets: string; // 종목코드 목록 (ex. KRW-BTC,BTC-ETH)
}

// 호가 정보 response 모델
export interface OrderbookModel {
  market: string; // 종목코드
  timestamp: number; // 호가 생성 시각
  total_ask_size: number; // 호가 매도 총 잔량
  total_bid_size: number; // 호가 매수 총 잔량
  orderbook_units: object[]; // 호가
  ask_price: number; // 매도호가
  bid_price: number; // 매수호가
  ask_size: number; // 매도 잔량
  bid_size: number; // 매수 잔량
}

export interface OrderbookServiceModel {
  getOrderbooks: (data: OrderbookRequestModel) => Promise<OrderbookModel[]>;
}

export default class OrderbookService implements OrderbookServiceModel {
  /**
   * 호가 정보 조회
   * @param data
   * @returns 호가 정보
   */
  async getOrderbooks(data: OrderbookRequestModel): Promise<OrderbookModel[]> {
    try {
      const res = await publicAPI.get('/Orderbook', {
        params: data,
      });

      return res.data || [];
    } catch (error) {
      logger.error('error.', {
        main: 'OrderbookService',
        sub: 'getOrderbooks',
        data: { error },
      });
      throw error;
    }
  }
}
