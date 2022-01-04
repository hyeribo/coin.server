export default {
  EXCEPTED_COINS: ['KRW-BTC'],
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
