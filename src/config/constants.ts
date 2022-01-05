export default {
  WS_PING_TIME: 100_000, // 웹소켓 PING 연결 인터벌
  WS_SNAPSHOT: true,
  WS_REALTIME: false,

  MAX_PROC_COIN_COUNT: 3, // 최대 자동화할 코인 수
  EXCLUDE_COINS: ['APENFT'], // 프로세스에서 제외할 코인 (없을경우 'NONE'을 넣어준다.)

  // ref: https://docs.upbit.com/docs/market-info-trade-price-detail
  // 호가 (index 이상 - index+1 미만)
  PRICE_UNITS: [
    0, 0.1, 1, 10, 100, 1_000, 10_000, 100_000, 500_000, 1_000_000, 2_000_000,
  ],
  // 주문 가격 단위 (호가 index)
  ORDER_PRICE_UNITS: [0.000_1, 0.001, 0.01, 0.1, 1, 5, 10, 50, 100, 500, 1_000],

  ORDER_STATE_VALUE: {
    wait: 2,
    watch: 1,
    done: -1,
    cancel: -2,
  },
};
