export default {
  /*************** 업비트 지정 ***************/
  WS_CONN_LIMIT_PER_SEC: 5, // 초당 Websocket 연결 수 제한
  WS_CONN_LIMIT_PER_MIN: 100, // 분당 Websocket 연결 수 제한
  API_REQ_LIMIT: {
    ORDER_PER_SEQ: 8, // 초당 주문요청 API 요청 제한
    ORDER_PER_MIN: 200, // 분당 주문요청 API 요청 제한
    EXCHANGE_PER_SEQ: 30, // 초당 주문조회 API 요청 제한
    EXCHANGE_PER_MIN: 900, // 분당 주문조회 API 요청 제한
    QUOTATION_PER_SEQ: 10, // 초당 시세조회 API 요청 제한
    QUOTATION_PER_MIN: 600, // 분당 시세조회 API 요청 제한
  },
  MIN_ORDER_AMOUNT: 5000, // 최소주문금액

  /*************** 사용자 지정 ***************/
  // WS_PING_TIME: 100_000, // 웹소켓 PING 연결 인터벌
  WS_PING_TIME: 5_000, // 웹소켓 PING 연결 인터벌

  ORDER_API_REQ_LIMIT_PER_SEQ: 3, // 초당 주문요청 API 요청 제한 (분당 횟수 / 60)
  EXCHANGE_API_REQ_LIMIT_PER_SEQ: 3, // 초당 주문조회 API 요청 제한 (분당 횟수 / 60)
  QUOTATION_API_REQ_LIMIT_PER_SEQ: 3, // 초당 시세조회 API 요청 제한 (분당 횟수 / 60)

  MAX_PROC_COIN_COUNT: 3, // 최대 자동화할 코인 수 (1/3/5/15)중에 하나
  // EXCLUDE_COINS: ['NONE'], // 프로세스에서 제외할 코인 (없을경우 'NONE'을 넣어준다.)
  EXCLUDE_COINS: ['APENFT'], // 프로세스에서 제외할 코인 (없을경우 'NONE'을 넣어준다.)
  INCLUDE_COINS: [], // 프로세스에 포함할 코인
  DEFAULT_MARKET_CURRENCY: 'KRW', // default 단위 화폐
  MIN_TRADABLE_BALANCE: {
    // 코인당 최소 거래 가능한 기준화폐 금액
    KRW: 100_000,
    BTC: 0.000_1,
  },
  MAX_PID_AMOUNT_PER_ORDER: 200000, // 최대 주문 가능 금액
  TRADE_CHUNK_COUNT: 4, // 코인당 분할 매수/매도 카운트
};
