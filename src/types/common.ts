// 마켓 화폐 코드
export type MarketCurrencyType = 'KRW' | 'BTC';

// 종목 투자유의 유무
// - NONE : 해당 사항 없음
// - CAUTION : 투자유의
export type MarketWarningType = 'NONE' | 'CAUTION';

// 주문 종류
// - ASK : 매도
// - BID : 매수
export type OrderSideType = 'ASK' | 'BID';
// export type OrderSideLowerType = 'ask' | 'bid';
export enum OrderSideLowerType {
  ask = 'ask',
  bid = 'bid',
}

// 주문 상태
// - wait : 체결 대기 (default)
// - watch : 예약주문 대기
// - done : 전체 체결 완료
// - cancel : 주문 취소
export type OrderStateType = 'wait' | 'watch' | 'done' | 'cancel';
// export enum OrderStateEnum {
//   wait = 2,
//   watch = 1,
//   done = -1,
//   cancel = -2,
// }

// 주문 타입
// - limit : 지정가 주문
// - price : 시장가 주문(매수)
// - market : 시장가 주문(매도)
// export type OrderType = 'limit' | 'price' | 'market';
export enum OrderType {
  limit = 'limit',
  price = 'price',
  market = 'market',
}

// 정렬 방식
// - asc : 오름차순
// - desc : 내림차순 (default)
export type DataOrderByType = 'asc' | 'desc';

// websocket 요청/응답 타입
// - ticker : 현재가
// - trade : 체결
// - orderbook : 호가
export type MessageType = 'ticker' | 'trade' | 'orderbook';
