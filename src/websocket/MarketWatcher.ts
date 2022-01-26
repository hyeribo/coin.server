import logger from '@src/config/winston';
import WebSocketClient from 'ws';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';

import MarketService, {
  MarketCoinResponseModel,
} from '@src/services/MarketService';
import { MarketCurrencyType } from '@src/types/common';
import config from '@src/config';

const marketService = new MarketService();

const { WS_PING_TIME, WS_SNAPSHOT, WS_REALTIME, WS_CONN_LIMIT_PER_SEC } =
  config;

const UPBIT_WS_URL = process.env.UPBIT_WS_URL || '';

interface TickerResponseModel {
  ty: string; // 타입 (ticker)
  cd: string; // 종목코드 (ex. KRW-BTC)
  op: number; // 시가
  hp: number; // 고가
  lp: number; // 저가
  tp: number; // 현재가
  pcp: number; // 전일종가
  c: 'RISE' | 'EVEN' | 'FALL'; // 전일 대비 (RISE : 상승, EVEN : 보합, FALL : 하락)
  cp: number; // 부호 없는 전일 대비 값
  scp: number; //전일 대비 값
  cr: number; // 부호 없는 전일 대비 등락율
  scr: number; // 전일 대비 등락율
  tv: number; // 가장 최근 거래량
  atv: number; // 누적 거래량(UTC 0시 기준)
  atv24h: number; // 24시간 누적 거래량
  atp: number; // 누적 거래대금(UTC 0시 기준)
  atp24h: number; // 24시간 누적 거래대금
  tdt: string; // 최근 거래 일자(UTC) (yyyyMMdd)
  ttm: string; // 최근 거래 시각(UTC) (HHmmss)
  ttms: number; // 체결 타임스탬프 (milliseconds)
  ab: 'ASK' | 'BID'; // 매수/매도 구분 (ASK : 매도, BID: 매수)
  aav: number; // 누적 매도량
  abv: number; // 누적 매수량
  h52wp: number; // 52주 최고가
  h52wdt: string; // 52주 최고가 달성일 (yyyy-MM-dd)
  l52wp: number; // 52주 최저가
  l52wdt: string; // 52주 최저가 달성일 (yyyy-MM-dd)
  ts: string; // 거래상태 *deprecated
  ms: 'PREVIEW' | 'ACTIVE' | 'DELISTED'; // 거래상태 (PREVIEW : 입금지원, ACTIVE : 거래지원가능, DELISTED : 거래지원종료)
  msfi: string; // 거래 상태 *deprecated
  its: boolean; // 거래 정지 여부
  dd: Date; // 상장폐지일
  mw: 'NONE' | 'CAUTION'; // 유의 종목 여부 (NONE : 해당없음, CAUTION : 투자유의)
  tms: number; // 타임스탬프 (milliseconds)
  st: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입 (SNAPSHOT : 스냅샷, REALTIME : 실시간)
}

// type : 수신할 시세 타입
// - ticker : 현재가
// - trade : 체결
// - orderbook : 호가
interface SendMessageModel {
  0: { ticket: string }; // 식별값 (uuid)
  1: {
    type: 'ticker' | 'trade' | 'orderbook'; // 수신할 시세 타입
    codes: string[]; // 수신할 시세 종목 정보. (대문자로 요청해야 한다.)
    isOnlySnapshot?: boolean; // 시세 스냅샷만 제공
    isOnlyRealtime?: boolean; // 실시간 시세만 제공
  };
  2: {
    format: 'SIMPLE' | 'DEFAULT'; // 포맷 (SIMPLE : 간소화된 필드명, DEFAULT : 생략 가능)
  };
}

interface MarketWatcherModel {
  // status: 'loading' | 'loaded';
  // isAlive: boolean;
  // socket: WebSocketClient;
  // pingInterval?: ReturnType<typeof setInterval>;
  // marketCurrency: MarketCurrencyType;
  // allCoinSnapshots: TickerResponseModel[];
  allCoinCodes: string[];
  allCoinCount: number;

  init: () => void;
  setAllCoins: () => void;
  // connect: () => void;
  // sendMessage: () => void;
  handleMessage: (data: Buffer) => object;
  heartbeat: () => void;
  destroy: () => void;
}

export default class MarketWatcher implements MarketWatcherModel {
  private status: 'loading' | 'loaded' = 'loading';
  private isAlive = false;
  private socket!: WebSocketClient;
  private pingInterval?: ReturnType<typeof setInterval>;
  private marketCurrency: MarketCurrencyType;
  private allCoinSnapshots: TickerResponseModel[] = []; // 모든 코인의 스냅샷
  allCoinCodes: string[] = []; // 모든 코인 코드
  allCoinCount = 0; // 모든 코인 개수

  constructor(marketCurrency: MarketCurrencyType) {
    this.marketCurrency = marketCurrency;
  }

  /**
   * 초기화
   */
  init = async () => {
    await this.setAllCoins();
    this.connect();
  };

  /**
   * 모든 코인 & 코인 코드 세팅
   */
  async setAllCoins() {
    try {
      const allCoins: MarketCoinResponseModel[] =
        await marketService.getAllCoins(this.marketCurrency);
      if (!allCoins || !allCoins.length) {
        throw new Error('allCoins are empty.');
      }

      const allCoinCodes = allCoins.map((coin) => coin.market);
      this.allCoinCodes = allCoinCodes;
      this.allCoinCount = allCoinCodes.length;

      logger.info('Set all coins info', {
        main: 'MarketWatcher',
        data: { allCoinCount: this.allCoinCount },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 스냅샷 추가하기
   * @param snapshot
   */
  addSnapshot = (snapshot: TickerResponseModel) => {
    this.allCoinSnapshots.push(snapshot);

    if (this.allCoinSnapshots.length === this.allCoinCount) {
      this.status = 'loaded';
      logger.verbose('All coin snapshots are added.', {
        main: 'MarketWatcher',
        data: { allCoinSnapshots: this.allCoinSnapshots },
      });
    }
  };

  private connect() {
    this.socket = new WebSocketClient(UPBIT_WS_URL);
    this.socket.on('open', () => {
      logger.info('Connection opened.', {
        main: 'MarketWatcher',
        data: { marketCurrency: this.marketCurrency },
      });

      this.heartbeat();
      this.pingInterval = setInterval(() => {
        this.heartbeat();
      }, WS_PING_TIME);

      // this.sendMessage();
      this.getAllCoinSnapshots(this.allCoinCodes);
    });

    this.socket.on('message', this.handleMessage);

    this.socket.on('close', () => {
      console.log('Connection closed.');
    });
  }

  getAllCoinSnapshots(coinCodes: string[]) {
    console.log('coinCodes =====>>> ', coinCodes);
    const params = [
      { ticket: uuid() },
      {
        type: 'ticker',
        codes: coinCodes,
        isOnlySnapshot: true,
      },
      { format: 'SIMPLE' },
    ];

    const message = Buffer.from(JSON.stringify(params));
    this.socket.send(message);
    logger.verbose('send :', { main: 'MarketWatcher', data: params });
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   */
  // sendMessage() {
  //   const params = [
  //     { ticket: uuid() },
  //     {
  //       type: 'ticker',
  //       codes: [`${this.marketCurrency}-123`],
  //       isOnlySnapshot: WS_SNAPSHOT,
  //       isOnlyRealtime: WS_REALTIME,
  //     },
  //     { format: 'SIMPLE' },
  //   ];

  //   const message = Buffer.from(JSON.stringify(params));
  //   this.socket.send(message);
  //   logger.verbose('send :', { main: 'WebSocket', data: params });
  // }

  /**
   * The WebSocket protocol only works with text and binary data.
   * @param data
   */
  handleMessage = (data: Buffer) => {
    const message = JSON.parse(data.toString());

    if (message.ty === 'ticker') {
      this.addSnapshot(message);
    } else {
      logger.verbose('received :', {
        main: 'WebSocket',
        data: message,
      });
    }
    return message;
  };

  /**
   * 업비트 웹소켓 서버에서는 기본적으로 아무런 데이터도 수/발신 되지 않은 채 약 120초가 경과하면
   * Idle Timeout으로 WebSocket Connection을 종료한다.
   * 이를 방지하기 위해 100초마다 PING 메시지를 보내서 Connection을 유지한다.
   */
  heartbeat() {
    logger.verbose('heartbeat.', { main: 'WebSocket' });
    this.isAlive = true;
    this.socket.send('PING');
  }

  /**
   * Socket 인스턴스 삭제 전
   * 소켓 커넥션 연결 해제,
   * 인터벌 제거
   */
  destroy() {
    this.isAlive = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.socket.terminate();
  }
}
