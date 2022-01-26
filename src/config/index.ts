export default {
  WS_CONN_LIMIT_PER_SEC: 5, // 초당 Websocket 연결 수 제한 (업비트 지정)
  WS_CONN_LIMIT_PER_MIN: 100, // 분당 Websocket 연결 수 제한 (업비트 지정)
  API_REQ_LIMIT_PER_SEC: 10, // 초당 REST API 요청 수 제한 (업비트 지정)
  API_REQ_LIMIT_PER_MIN: 600, // 분당 REST API 요청 수 제한 (업비트 지정)

  WS_PING_TIME: 100_000, // 웹소켓 PING 연결 인터벌
  WS_SNAPSHOT: false,
  WS_REALTIME: false,

  MAX_PROC_COIN_COUNT: 3, // 최대 자동화할 코인 수
  // EXCLUDE_COINS: ['NONE'], // 프로세스에서 제외할 코인 (없을경우 'NONE'을 넣어준다.)
  EXCLUDE_COINS: ['APENFT'], // 프로세스에서 제외할 코인 (없을경우 'NONE'을 넣어준다.)
  INCLUDE_COINS: [], // 프로세스에 포함할 코인
  DEFAULT_MARKET_CURRENCY: 'KRW', // default 단위 화폐
  MIN_TRADABLE_BALANCE: {
    // 최소 거래 가능한 기준화폐 금액
    KRW: 10000,
    BTC: 0.000_1,
  },
};
