import logger from '@src/config/winston';
import WebSocketClient from 'ws';
import { v4 as uuid } from 'uuid';

import { MessageType, MarketCurrencyType } from '@src/types/common';
import { MyCoinResponseModel } from '@src/services/AccountService';
import config from '@src/config';

const { WS_PING_TIME } = config;

const UPBIT_WS_URL = process.env.UPBIT_WS_URL || '';

export interface TickerResponseModel {
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
  ms: 'PREVIEW' | 'ACTIVE' | 'DELISTED'; // 거래상태 (PREVIEW : 입금지원, ACTIVE : 거래지원가능, DELISTED : 거래지원종료)
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
    type: 'ticker' | 'trade' | 'orderbook'; // 수신할 시세 타입 (현재가/체결/호가)
    codes: string[]; // 수신할 시세 종목 정보. (대문자로 요청해야 한다.)
    isOnlySnapshot?: boolean; // 시세 스냅샷만 제공
    isOnlyRealtime?: boolean; // 실시간 시세만 제공
  };
  2: {
    format: 'SIMPLE' | 'DEFAULT'; // 포맷 (SIMPLE : 간소화된 필드명, DEFAULT : 생략 가능)
  };
}

// TODO: 필수적인 interface인가?
interface WebSocketModel {
  isAlive: boolean;
  mSymbol: string; // 단위화폐-심볼 형식의 코드
  type: MessageType; // 메세지 타입
  socket: WebSocketClient;
  pingInterval?: ReturnType<typeof setInterval>;

  onConnect: () => void;
  onMessage: (data: Buffer) => any;
  connect: () => void;
  sendMessage: (isOnlySnapshot?: boolean, isOnlyRealtime?: boolean) => any;
  heartbeat: () => void;
  destroy: () => void;
}

export default abstract class WebSocket implements WebSocketModel {
  isAlive = false;
  mSymbol;
  type;

  socket!: WebSocketClient;
  pingInterval?: ReturnType<typeof setInterval>;

  constructor(mSymbol: string, type: MessageType) {
    if (!mSymbol) {
      throw new Error('mSymbol is not provided.');
    }
    if (!type) {
      throw new Error('type is not provided.');
    }

    this.mSymbol = mSymbol;
    this.type = type;
  }

  // 소켓 연결시 실행 함수
  abstract onConnect(): void;

  // 메세지 수신시 실행 함수
  abstract onMessage(data: Buffer): any;

  connect() {
    this.socket = new WebSocketClient(UPBIT_WS_URL);

    // 소켓 연결
    this.socket.on('open', () => {
      this.isAlive = true;

      logger.info('Connection opened.', {
        main: 'WebSocket',
        data: { mSymbol: this.mSymbol, type: this.type },
      });

      this.heartbeat();
      this.pingInterval = setInterval(() => {
        this.heartbeat();
      }, WS_PING_TIME);

      // 메세지 요청
      this.onConnect();
    });

    // 소켓 메세지 수신
    this.socket.on('message', (data: Buffer) => this.onMessage(data));

    // 소켓 연결 해제
    this.socket.on('close', () => {
      this.isAlive = false;
      logger.info('Connection closed.', {
        main: 'WebSocket',
        data: { mSymbol: this.mSymbol },
      });
    });
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   * @param isOnlySnapshot 시세 스냅샷만 제공
   * @param isOnlyRealtime 실시간 시세만 제공
   * 파라미터를 모두 보내지 않을시, 스냅샷과 실시간 데이터 모두를 수신한다.
   */
  sendMessage(isOnlySnapshot?: boolean, isOnlyRealtime?: boolean) {
    const params = [
      { ticket: uuid() },
      {
        type: this.type,
        codes: [this.mSymbol],
        isOnlySnapshot: isOnlySnapshot || false,
        isOnlyRealtime: isOnlyRealtime || false,
      },
      { format: 'SIMPLE' },
    ];

    const message = Buffer.from(JSON.stringify(params));
    this.socket.send(message);
    logger.verbose('send :', { main: 'WebSocket', data: params });
  }

  /**
   * 업비트 웹소켓 서버에서는 기본적으로 아무런 데이터도 수/발신 되지 않은 채 약 120초가 경과하면
   * Idle Timeout으로 WebSocket Connection을 종료한다.
   * 이를 방지하기 위해 100초마다 PING 메시지를 보내서 Connection을 유지한다.
   */
  heartbeat() {
    logger.verbose('heartbeat.', { main: 'WebSocket' });
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
