import logger from '@src/config/winston';

import WebSocket from '@src/websocket';

export interface WSOrderbookUnitsModel {
  ap: number; // 매도호가
  bp: number; // 매수 호가
  as: number; // 매도 잔량
  bs: number; // 매수 잔량
  tms: number; // 타임스탬프
}

// 호가 정보 response 모델
export interface WSOrderbookModel {
  ty: string; // 타입 (orderbook)
  cd: string; // mSymbol
  tas: number; // 호가 매도 총 잔량
  tbs: number; // 호가 매수 총 잔량
  obu: WSOrderbookUnitsModel[]; // 호가
}

export default class OrderbookWS extends WebSocket {
  isReady: boolean = false; // 준비 여부. (소켓 연결 & init snapshot)
  isUpdated: boolean = false; // 최신 데이터 갱신 여부.
  snapshot!: WSOrderbookModel;

  constructor(mSymbol: string) {
    super(mSymbol, 'orderbook');
  }

  /**
   * 소켓 연결시 스냅샷 데이터 요청
   * @param data
   */
  onConnect() {
    this.sendMessage(true, false);
  }

  /**
   * The WebSocket protocol only works with text and binary data.
   * 호가 메세지 수신시
   * @param data
   */
  onMessage(data: Buffer) {
    const message = JSON.parse(data.toString());

    if (message.ty === 'orderbook') {
      // 맨 처음 요청 경우 isReady 처리.
      if (!this.snapshot) {
        this.isReady = true;
      }
      this.snapshot = message;
      this.isUpdated = true;

      logger.verbose('Orderbook received :', {
        main: 'WebSocket',
        data: { message },
      });
    }
  }

  updateSnapshot() {
    this.isUpdated = false;
    this.sendMessage(true, false);
  }

  /**
   * 스냅샷 데이터 핸들러
   * @param data
   */
  handleSnapshot(data: object) {}

  /**
   * 스트림 데이터 핸들러
   * @param data
   */
  handleStream(data: object) {}

  /**
   * 호가 정보 가져오기
   * @param index
   * @returns
   */
  get orderbookUnits(): WSOrderbookUnitsModel[] {
    return this.snapshot.obu;
  }
}
