import logger from '@src/config/winston';
import { v4 as uuid } from 'uuid';

import TickerWS from '@src/websocket/TickerWS';
import TradeWS from '@src/websocket/TradeWS';
import OrderbookWS, { WSOrderbookUnitsModel } from '@src/websocket/OrderbookWS';

import {
  OrderModel,
  OrderableInfoModel,
  order,
  getOrderableInfoByCoin,
} from '@src/services/OrderService';
import { MyCoinResponseModel } from '@src/services/AccountService';
import { OrderSideLowerType, OrderType } from '@src/types/common';

import config from '@src/config';

const { MIN_ORDER_AMOUNT } = config;

export default class MyCoin {
  public status: 'stopped' | 'started' = 'stopped';

  // tickerWS: TickerWS; // 현재가 웹소켓
  // tradeWS: TradeWS; // 체결 웹소켓
  orderbookWS: OrderbookWS; // 호가 웹소켓

  readyInterval?: ReturnType<typeof setInterval>; // 준비상태 체크 인터벌
  watchTradeInterval?: ReturnType<typeof setInterval>; // 주문 체결 감시 인터벌

  private symbol; // 화폐를 의미하는 영문 대문자 코드
  private balance; // 매도 가능 수량
  private locked; // 매도 대기중인 수량
  private avgBuyPrice; // 매수평균가
  private avgBuyPriceModified; // 매수평균가 수정 여부
  private marketCurrency; // 마켓 심볼
  private mSymbol; // 마켓-심볼 코드

  private chance!: OrderableInfoModel; // 주문 가능 정보
  private bids: any = {}; // 매수 주문 대기 정보
  private asks: any = {}; // 매도 주문 대기 정보
  private bidTrades: any[] = []; // 매수 체결 정보
  private askTrades: any[] = []; // 매도 체결 정보
  private currentBidTrade?: any; // 최근 매수 체결 정보
  private currentAskTrade?: any; // 최근 매도 체결 정보

  private marketCurrencyLimit: number = 0; // 거래에 할당된 금액
  private marketCurrencyBalance: number = 0; // 매수 가능 금액
  private marketCurrencyLocked: number = 0; // 매수 대기중인 금액

  constructor(
    obj: MyCoinResponseModel,
    marketCurrencyLimit: number,
    prevOrders?: OrderModel[],
  ) {
    this.symbol = obj.symbol;
    this.balance = obj.balance;
    this.locked = obj.locked;
    this.avgBuyPrice = obj.avgBuyPrice;
    this.avgBuyPriceModified = obj.avgBuyPriceModified;
    this.marketCurrency = obj.marketCurrency;
    this.mSymbol = obj.mSymbol;

    // this.tickerWS = new TickerWS(this.mSymbol);
    // this.tradeWS = new TradeWS(this.mSymbol);
    this.orderbookWS = new OrderbookWS(this.mSymbol);

    if (prevOrders) {
      prevOrders.forEach((prevOrder) => {
        const { side, uuid } = prevOrder;
        if (side === OrderSideLowerType.ask) {
          this.asks[uuid] = prevOrder;
        } else if (prevOrder.side === OrderSideLowerType.bid) {
          this.bids[uuid] = prevOrder;
        }
      });
    }
  }

  /**
   * TODO: 매도 주문 걸기
   * @param volume 매도 주문량 (지정가 필수, 시장가 매도시 필수)
   * @param price 매도 주문 가격
   * @returns 성공여부
   */
  private async orderAsk(volume: number, price: number): Promise<boolean> {
    try {
      const identifier = uuid();
      this.asks[identifier] = { state: 'pending' };

      const params = {
        market: this.mSymbol,
        side: OrderSideLowerType.ask,
        volume: volume.toString(),
        price: price.toString(),
        ord_type: OrderType.limit, // 시장가 주문
        identifier,
      };

      const res = await order(params);

      logger.info('Order ask successed.', {
        main: 'MyCoin',
        sub: 'orderAsk',
        data: { volume, price },
      });

      // orderService.

      return true;
    } catch (error) {
      logger.error('Order ask failed.', {
        main: 'MyCoin',
        sub: 'orderAsk',
        data: error,
      });
      return false;
    }
  }

  /**
   * TODO: 매수 주문 걸기
   * @param volume 매수 주문량
   * @param price 매수 주문 가격 (지정가 필수, 시장가 매수시 필수)
   * @returns 성공여부
   */
  private orderBid(volume: number, price: number): boolean {
    try {
      const identifier = uuid();
      this.bids[identifier] = { state: 'pending' };

      const params = {
        market: this.mSymbol,
        side: 'bid',
        volume,
        price,
        ord_type: 'limit', // 시장가 주문
        identifier,
      };

      logger.info('Order bid successed.', {
        main: 'MyCoin',
        sub: 'orderBid',
        data: { volume, price },
      });

      return true;
    } catch (error) {
      logger.error('Order bid failed.', {
        main: 'MyCoin',
        sub: 'orderBid',
        data: error,
      });
      return false;
    }
  }

  /**
   * 거래하기
   */
  private trade(orderSide: OrderSideLowerType, obUnit: WSOrderbookUnitsModel) {}

  private proceed() {
    // 두번째 호가
    const obUnit: WSOrderbookUnitsModel = this.orderbookWS.orderbookUnits[1];

    // 최소 주문 금액 이상 코인을 소유했으면 매도 요청
    const canOrderAsk = obUnit.bp * this.balance > MIN_ORDER_AMOUNT;
    // 주문가능하고, 평균 매수가가 호가보다 높으면 매도 요청
    if (canOrderAsk && obUnit.bp > this.avgBuyPrice) {
      this.trade(OrderSideLowerType.ask, obUnit);
    }
  }
  /**
   * 거래 전 상태 체크 & 매도 하기
   */
  private beforeTrade(): void {
    // 두번째 호가
    const obUnit: WSOrderbookUnitsModel = this.orderbookWS.orderbookUnits[1];

    // 최소 주문 금액 이상 코인을 소유했으면 매도 요청
    const canOrderAsk = obUnit.bp * this.balance > MIN_ORDER_AMOUNT;
    // 주문가능하고, 평균 매수가가 호가보다 높으면 매도 요청
    if (canOrderAsk && obUnit.bp > this.avgBuyPrice) {
      this.trade(OrderSideLowerType.ask, obUnit);
    }

    logger.verbose('canOrderAsk', {
      main: 'MyCoin',
      sub: 'checkReady',
      data: {
        'obUnit.bp': obUnit.bp,
        'this.balance': this.balance,
        'MIN_ORDER_AMOUNT': MIN_ORDER_AMOUNT,
        canOrderAsk,
      },
    });
  }

  /**
   * 체결 watch
   */
  private async watchTrade() {
    try {
      // console.log('trade');
    } catch (error) {}
  }

  // 주문정보 세팅, 호가 웹소켓 연결 체크
  private checkReady(): void {
    if (this.chance && this.orderbookWS.isReady) {
      if (this.readyInterval) {
        clearInterval(this.readyInterval);
      }
      logger.verbose('Ready to work.', {
        main: 'MyCoin',
        sub: 'checkReady',
        data: { snapshot: this.orderbookWS.snapshot },
      });

      this.status = 'started';
      this.beforeTrade();
    }
  }

  /**
   * 전체 웹소켓 연결
   */
  private connectWebsockets(): void {
    // 현재가 웹소켓 생성 & 연결
    // this.tickerWS.connect();
    // 체결 웹소켓 생성 & 연결
    // this.tradeWS.connect();

    // 호가 웹소켓 생성 & 연결
    this.orderbookWS.connect();
  }

  /**
   * 거래 시작하기
   * @param data
   */
  public async startTrade(): Promise<void> {
    try {
      this.connectWebsockets();

      // 주문 가능 정보 세팅
      const result: OrderableInfoModel = await getOrderableInfoByCoin(
        this.mSymbol,
      );
      this.chance = result;

      // 작업 준비 체크 interval
      this.readyInterval = setInterval(() => {
        this.checkReady();
      }, 500);

      // 체결 watch interval
      this.watchTradeInterval = setInterval(() => {
        this.watchTrade();
      }, 100); // 0.1초에 한번. (최대 15회 초당 요청)
    } catch (error) {
      logger.error('Start trade failed.', {
        main: 'MyCoin',
        sub: 'startTrade',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 코인 거래 중지
   * @param mSymbol
   */
  public stopTrade() {
    // 작업 준비 체크 interval 삭제
    if (this.readyInterval) {
      clearInterval(this.readyInterval);
    }
    // 체결 watch interval 삭제
    if (this.watchTradeInterval) {
      clearInterval(this.watchTradeInterval);
    }
    // 소켓 연결 해제
    this.orderbookWS.destroy();
  }

  /**
   * 데이터 세팅하기
   * @param data
   */
  public setData(data: MyCoinResponseModel): void {
    if (data.symbol) {
      this.symbol = data.symbol;
    }
    if (data.balance) {
      this.balance = data.balance;
    }
    if (data.locked) {
      this.locked = data.locked;
    }
    if (data.avgBuyPrice) {
      this.avgBuyPrice = data.avgBuyPrice;
    }
    if (data.avgBuyPriceModified) {
      this.avgBuyPriceModified = data.avgBuyPriceModified;
    }
    if (data.marketCurrency) {
      this.marketCurrency = data.marketCurrency;
    }
  }

  /**
   * 데이터 가져오기
   * @returns
   */
  public getData(): MyCoinResponseModel {
    return {
      symbol: this.symbol,
      balance: this.balance,
      locked: this.locked,
      avgBuyPrice: this.avgBuyPrice,
      avgBuyPriceModified: this.avgBuyPriceModified,
      marketCurrency: this.marketCurrency,
      mSymbol: this.mSymbol,
    };
  }
}
