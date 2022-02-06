import { privateAPI } from '@src/config/axios';
import logger from '@src/config/winston';

import {
  OrderSideLowerType,
  OrderStateType,
  OrderType,
  DataOrderByType,
} from '@src/types/common';

/*************** getOrderableInfoByCoin START ***************/
export interface OrderInfoMarketRestrictions {
  currency: string; // 화폐를 의미하는 영문 대문자 코드
  price_unit: string; // 주문금액 단위
  min_total: number; // 최소 매도/매수 금액
}

export interface OrderInfoMarketModel {
  id: string; // 마켓의 유일 키 (ex: KRW-BORA)
  name: string; // 마켓 이름 (ex: KRW-BORA)
  order_types: string[]; // 지원 주문 방식 (TODO: type 샘플 필요. )
  order_sides: OrderSideLowerType[]; // 지원 주문 종류 (ex: ['ask', 'bid'])
  bid: OrderInfoMarketRestrictions;
  ask: OrderInfoMarketRestrictions;
  max_total: string; // 최대 매도/매수 금액
  state: string; // 마켓 운영 상태
}

export interface OrderInfoAskBidAccountModel {
  currency: string; // 화폐를 의미하는 영문 대문자 코드
  balance: string; // 주문가능 금액(bid)/수량(ask)
  locked: string; // 주문 중 묶여있는 금액(bid)/수량(ask)
  avg_buy_price: string; // 매수평균가
  avg_buy_price_modified: boolean; // 매수평균가 수정 여부
  unit_currency: string; // 평단가 기준 화폐
}

// 종목별 주문 가능 정보 response 모델
export interface OrderableInfoModel {
  bid_fee: string; // 매수 수수료 비율
  ask_fee: string; // 매도 수수료 비율
  market: OrderInfoMarketModel; // 마켓에 대한 정보
  bid_account: OrderInfoAskBidAccountModel; // 매수 시 사용하는 화폐의 계좌 상태
  ask_account: OrderInfoAskBidAccountModel; // 매도 시 사용하는 화폐의 계좌 상태
}
/*************** getOrderableInfoByCoin END ***************/

/*************** getOrderDetail & getOrders START ***************/
// 주문 체결 모델
export interface OrderTradesModel {
  market: string; // 마켓의 유일 키
  uuid: string; // 체결의 고유 아이디
  price: string; // 체결 가격
  volume: string; // 체결 양
  funds: string; // 체결된 총 가격
  side: string; // 체결 종류
  created_at: string; // 체결 시각
}

// 주문 response 모델
export interface OrderModel {
  uuid: string; // 주문의 고유 아이디
  side: OrderSideLowerType; // 주문 종류
  ord_type: string; // 주문 방식
  price: string; // 주문 당시 화폐 가격
  state: string; // 주문 상태
  market: string; // 마켓의 유일키
  created_at: string; // 주문 생성 시간
  volume: string; // 사용자가 입력한 주문 양
  remaining_volume: string; // 체결 후 남은 주문 양
  reserved_fee: string; // 수수료로 예약된 비용
  remaining_fee: string; // 남은 수수료
  paid_fee: string; // 사용된 수수료
  locked: string; // 거래에 사용중인 비용
  executed_volume: string; // 체결된 양
  trade_count: number; // 해당 주문에 걸린 체결 수
}

// 단일 주문 response 모델
export interface OrderDetailModel extends OrderModel {
  trades: OrderTradesModel; // 체결
}

// 주문 목록 request 모델
export interface OrdersRequestModel {
  market?: string; // 종목코드
  uuids?: string[]; // 주문 UUID의 목록
  identifiers?: string[]; // 주문 identifier의 목록
  state?: OrderStateType; // 주문 상태
  states?: OrderStateType[]; // 주문 상태의 목록. * 미체결 주문(wait, watch)과 완료 주문(done, cancel)은 혼합하여 조회하실 수 없습니다.
  page: number; // 페이지 수, default: 1
  limit: number; // 요청 개수, default: 100
  order_by: DataOrderByType; // 정렬 방식
}

/*************** getOrderDetail & getOrders END ***************/

/*************** order START ***************/
export interface OrderRequestModel {
  market: string; // 마켓 ID (필수)
  side: OrderSideLowerType; // 주문 종류 (필수)
  volume: string; // 주문량 (지정가, 시장가 매도 시 필수)
  price: string; // 주문 가격. (지정가, 시장가 매수 시 필수)
  ord_type: OrderType; // 주문 타입 (필수)
  identifier?: string; // 조회용 사용자 지정값 (선택)
}
/*************** order END ***************/

export interface OrderServiceModel {
  getOrderableInfoByCoin: (market: string) => Promise<OrderableInfoModel>;
}

/******************************/
/******************************/
/******************************/
/******************************/
/******************************/
/******************************/

/**
 * 종목별 주문 가능 정보
 * @param mSymbol 조회할 종목코드 (ex: KRW-BORA)
 * @returns 주문 가능 정보
 */
export async function getOrderableInfoByCoin(
  mSymbol: string,
): Promise<OrderableInfoModel> {
  try {
    const res = await privateAPI.get('/orders/chance', {
      params: { market: mSymbol },
    });

    logger.info('data.', {
      main: 'OrderService',
      sub: 'getOrderableInfoByCoin',
      data: res.data,
    });

    return res.data || {};
  } catch (error: any) {
    console.log(error);
    logger.error('error.', {
      main: 'OrderService',
      sub: 'getOrderableInfoByCoin',
      data: { error },
    });
    throw error;
  }
}

/**
 * 개별 주문 조회 (uuid와 identifier 둘 중 하나 필수)
 * @param uuid 주문 UUID
 * @param identifier 조회용 사용자 지정 값
 * @returns 주문 상세 정보
 */
export async function getOrderDetail(
  data: { uuid?: string; identifier?: string } = {},
): Promise<OrderDetailModel> {
  try {
    if (!data.uuid && !data.identifier) {
      throw new Error('Both uuid and identifier are empty.');
    }

    const params = {
      uuid: data.uuid,
      identifier: data.identifier,
    };
    const res = await privateAPI.get('/order', {
      params,
    });

    logger.info('data.', {
      main: 'OrderService',
      sub: 'getOrderDetail',
      data: res.data,
    });

    return res.data || {};
  } catch (error: any) {
    console.log(error);
    logger.http('error.', {
      main: 'OrderService',
      sub: 'getOrderDetail',
      data: { error },
    });
    throw error;
  }
}

export async function getWaitingOrders(
  marketCurrency: string,
): Promise<OrderModel[]> {
  try {
    const res = await privateAPI.get('/orders', {
      data: { market: marketCurrency, state: 'wait' },
    });

    return res.data || [];
  } catch (error) {
    logger.http('error.', {
      main: 'OrderService',
      sub: 'getWaitingOrders',
      data: { error },
    });
    throw error;
  }
}

/**
 * 주문 목록 조회
 * @param data 조회할 주문 정보
 * @returns 주문 목록
 */
export async function getOrders(
  data: OrdersRequestModel,
): Promise<OrderModel[]> {
  try {
    // TODO: states 검사

    const res = await privateAPI.get('/orders', {
      data,
    });

    return res.data || [];
  } catch (error) {
    logger.http('error.', {
      main: 'OrderService',
      sub: 'getOrders',
      data: { error },
    });
    throw error;
  }
}

/**
 * 주문 취소 접수 (uuid와 identifier 둘 중 하나 필수)
 * @param uuid 주문 UUID
 * @param identifier 조회용 사용자 지정 값
 * @returns 주문 취소 정보
 */
export async function cancelOrder(
  data: { uuid?: string; identifier?: string } = {},
): Promise<OrderModel> {
  try {
    if (!data.uuid && !data.identifier) {
      throw new Error('Both uuid and identifier are empty.');
    }

    const res = await privateAPI.delete('/order', {
      data,
    });

    return res.data || {};
  } catch (error) {
    logger.http('error.', {
      main: 'OrderService',
      sub: 'cancelOrder',
      data: { error },
    });
    throw error;
  }
}

/**
 * 주문하기
 * @param data 주문 정보
 * @returns 주문 정보
 */
export async function order(data: OrderRequestModel): Promise<OrderModel> {
  try {
    const res = await privateAPI.post('/orders', {
      data,
    });

    return res.data || {};
  } catch (error) {
    logger.http('error.', {
      main: 'OrderService',
      sub: 'order',
      data: { error },
    });
    throw error;
  }
}

export default function Order() {}
