import logger from '@src/config/winston';

import WebSocket from '@src/websocket';

export default class TickerWS extends WebSocket {
  constructor(mSymbol: string) {
    super(mSymbol, 'ticker');
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
   * 현재가 메세지 수신시
   * @param data
   */
  onMessage(data: Buffer) {
    const message = JSON.parse(data.toString());

    logger.verbose('Ticker received :', {
      main: 'WebSocket',
      data: message,
    });
  }
}
