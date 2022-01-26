# Coin Server

## 에러 메세지

### marketCurrency not provided.

- 서버는 기준 화폐 단위로 작동한다.
- solution:
  1. marketCurrency를 제공한다. (KRW/BTC/USDT 중 하나)

### User have too many coins to run this server.

- 유저가 가진 코인의 수가 최대 동작할 코인의 수를 초과하면 에러.
- solution:
  1. MAX_PROC_COIN_COUNT를 늘린다.
  2. 업비트에서 수동으로 보유한 코인을 매도한다.

### User need 1 or more coins to run this server.

- 워커가 동작시킬 코인이 0개일때 발생.
- solution:
  1. INCLUDE_COINS에 동작시킬 코인 심볼을 추가한다. (EXCLUDE_COINS에 심볼이 추가되어있더라도, INCLUDE_COINS에 들어있다면 worker에 추가된다.)
  2. 업비트에서 수동으로 동작시킬 코인을 소량 매수한다.

### Not enough balance to trade.

- worker 실행을 위해 필요한 최소 거래 가능 금액보다 보유한 단위 화폐 금액이 적을경우 발생.
- solution:
  1. MIN_TRADABLE_BALANCE를 줄인다. (caution: 업비트 정책을 위한할 경우 에러가 발생할 수 있다.)
  2. 업비트의 단위 화폐를 충전한다.
