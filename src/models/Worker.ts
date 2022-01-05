import logger from '@src/config/winston';
import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import constants from '@src/config/constants';

const { WS_PING_TIME } = constants;

const UPBIT_WS_URL = process.env.UPBIT_WS_URL || '';

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
}

interface WorkerModel {
  isAlive: boolean;
  coinName: string;
  socket: WebSocket;
}

export default class Worker implements WorkerModel {
  isAlive: boolean = false;
  coinName = '';
  socket = new WebSocket(UPBIT_WS_URL);
  pingInterval?: ReturnType<typeof setInterval>;

  constructor(coinName: string) {
    if (!coinName) {
      throw new Error('coinName not defined.');
    }
    this.coinName = coinName;
  }

  init() {
    this.connectWS();
  }

  connectWS() {
    this.socket.on('open', () => {
      logger.info('Connection opened.', {
        main: 'WebSocket',
        data: { coinName: this.coinName },
      });

      this.heartbeat();
      this.pingInterval = setInterval(() => {
        this.heartbeat();
      }, WS_PING_TIME);

      this.sendMessage();
    });

    this.socket.on('message', this.handleMessage);

    this.socket.on('close', () => {
      console.log('Connection closed.');
    });
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   * @param data
   */
  sendMessage() {
    const params = [
      { ticket: uuid() },
      { type: 'ticker', codes: [this.coinName], isOnlyRealtime: true },
    ];

    const message = Buffer.from(JSON.stringify(params));
    this.socket.send(message);
    logger.verbose('send : ', { main: 'WebSocket', data: params });
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   * @param data
   */
  handleMessage(data: Buffer) {
    const message = JSON.parse(data.toString());
    logger.verbose('received :', {
      main: 'WebSocket',
      data: message,
    });
    return message;
  }

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
   * 인스턴스 삭제 전 소켓 커넥션 연결 해제
   */
  destroy() {
    this.isAlive = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.socket.terminate();
  }
}
