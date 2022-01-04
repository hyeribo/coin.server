// 주문 종류
// - ASK : 매도
// - BID : 매수
export type OrderSideType = 'ASK' | 'BID';
export type OrderSideLowerType = 'ask' | 'bid';

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
export type OrderType = 'limit' | 'price' | 'market';

// 정렬 방식
// - asc : 오름차순
// - desc : 내림차순 (default)
export type DataOrderByType = 'asc' | 'desc';
