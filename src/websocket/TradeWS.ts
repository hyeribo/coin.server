import logger from '@src/config/winston';

import WebSocket from '@src/websocket';

// 호가 정보 response 모델
export interface WSTradeModel {
  ty: string; // 타입 (trade)
  cd: string; // mSymbol
  tp: number; // 체결 가격
  tv: number; // 체결량
  ab: 'ASK' | 'BID'; // 매수/매도 구분
  pcp: number; // 전일 종가
  c: string; // 전일 대비
  cp: number; // 부호없는 전일 대비값
  td: string; // 체결 일자
  ttm: string; // 체결 시각
  ttms: number; // 체결 타임스탬프
  tms: number; // 타임스탬프
  sid: number; // 체결번호 (uniq)
  st: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입
}

export default class TradeWS extends WebSocket {
  constructor(mSymbol: string) {
    super(mSymbol, 'trade');
  }

  /**
   * 소켓 연결시
   * @param data
   */
  onConnect() {
    this.sendMessage();
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   * 체결 메세지 수신시
   * @param data
   */
  onMessage(data: Buffer) {
    const message = JSON.parse(data.toString());

    logger.verbose('Trade received :', {
      main: 'WebSocket',
      data: message,
    });
  }

  onMessage2(data: Buffer) {
    const message: WSTradeModel = JSON.parse(data.toString());

    logger.verbose('Trade received :', {
      main: 'WebSocket',
      data: message,
    });
  }
}
