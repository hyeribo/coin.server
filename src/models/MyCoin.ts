import logger from '@src/config/winston';
import { v4 as uuid } from 'uuid';

import TickerWS from '@src/websocket/TickerWS';
import TradeWS from '@src/websocket/TradeWS';
import OrderbookWS, { WSOrderbookUnitsModel } from '@src/websocket/OrderbookWS';

import {
  OrderModel,
  OrderableInfoModel,
  OrderDetailModel,
  order,
  getOrderableInfoByCoin,
  getOrderDetail,
  OrderTradeModel,
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

  private marketCurrencyLimit: number; // 작업에 할당된 총 금액
  private marketCurrencyBalance: number = 0; // 매수 가능 금액
  private marketCurrencyLocked: number = 0; // 매수 대기중인 금액

  private chance!: OrderableInfoModel; // 주문 가능 정보
  private bids: any[] = []; // 매수 주문 대기 정보
  private asks: any[] = []; // 매도 주문 대기 정보
  private bidTrades: any = {}; // 매수 체결 정보
  private askTrades: any = {}; // 매도 체결 정보

  private processOpeningPrice!: WSOrderbookUnitsModel; // 프로세스 시작시 시가
  private currentBidTrade?: any; // 최근 매수 체결 정보
  private currentAskTrade?: any; // 최근 매도 체결 정보

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

    this.marketCurrencyLimit = marketCurrencyLimit;
    this.orderbookWS = new OrderbookWS(this.mSymbol);

    if (prevOrders) {
      prevOrders.forEach((prevOrder) => {
        const { side, uuid } = prevOrder;
        if (prevOrder.side === OrderSideLowerType.bid) {
          this.bids.push(prevOrder);
        } else if (side === OrderSideLowerType.ask) {
          this.asks.push(prevOrder);
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
      // this.asks[identifier] = { state: 'pending' };

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
      // this.bids[identifier] = { state: 'pending' };

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

  private updateCoinInfo(): void {}

  /**
   * 매수주문이 완전히 체결된 후 실행
   * @param bidUuid 체결된 매수주문의 uuid
   */
  private handleAfterCompleteBid(bidUuid: string, trades: OrderTradeModel[]) {
    this.bids = this.bids.filter((bid) => bid.uuid !== bidUuid);
    delete this.bidTrades[bidUuid];
  }

  /**
   * 매도주문이 완전히 체결된 후 실행
   * @param askUuid 체결된 매도주문의 uuid
   */
  private handleAfterCompleteAsk(askUuid: string) {
    this.asks = this.asks.filter((ask) => ask.uuid !== askUuid);
    delete this.askTrades[askUuid];
  }

  /**
   * 거래 진행하기
   */
  private proceed(changedOrders: OrderDetailModel[]) {
    changedOrders.forEach((changedOrder) => {
      const { trades, ...orderInfo } = changedOrder;
      const { side, uuid, remaining_volume } = orderInfo;

      if (side === OrderSideLowerType.bid) {
        // 체결된 주문이 매수주문인경우
        if (+remaining_volume === 0) {
          this.handleAfterCompleteBid(uuid, trades);
          // 주문이 완전히 체결된 경우 경우 주문정보 삭제
          // this.bids = this.bids.filter((bid) => bid.uuid !== uuid);
          // delete this.bidTrades[uuid];
        } else {
          // 주문의 일부만 체결된 경우
          this.handleAfterCompleteAsk(uuid);

          // this.bids.forEach((bid) => {
          //   if (bid.uuid === uuid) {
          //   }
          // });
        }
      } else if (side === OrderSideLowerType.ask) {
        // 체결된 주문이 매도주문인경우
      }

      if (+remaining_volume === 0) {
        if (side === OrderSideLowerType.bid) {
          // 매수 주문이 완전히 체결된 경우
          this.bids = this.bids.filter((bid) => bid.uuid !== uuid);
          delete this.bidTrades[uuid];
        } else if (side === OrderSideLowerType.ask) {
          this.asks = this.asks.filter((ask) => ask.uuid !== uuid);
          delete this.askTrades[uuid];
        }
      } else {
        // 주문의 일부만 체결된 경우
        if (side === OrderSideLowerType.bid) {
          this.bids.forEach((bid) => {
            if (bid.uuid === uuid) {
            }
          });
          this.bids = this.bids.filter((bid) => bid.uuid !== uuid);
          delete this.bidTrades[uuid];
        } else if (side === OrderSideLowerType.ask) {
          this.asks = this.asks.filter((ask) => ask.uuid !== uuid);
          delete this.askTrades[uuid];
        }
      }

      // 주문가능 액수 계산 후 주문하기

      // 매도 가능 금액이 최소 거래 금액 이상인지 체크
      const isEnableAsk =
        this.balance * this.processOpeningPrice.ap > MIN_ORDER_AMOUNT;
      // 거래 수수료보다 이익이 큰지 체크
    });
    // 두번째 호가
    const obUnit: WSOrderbookUnitsModel = this.orderbookWS.orderbookUnits[1];

    // // 최소 주문 금액 이상 코인을 소유했으면 매도 요청
    // const canOrderAsk = obUnit.bp * this.balance > MIN_ORDER_AMOUNT;
    // // 주문가능하고, 평균 매수가가 호가보다 높으면 매도 요청
    // if (canOrderAsk && obUnit.bp > this.avgBuyPrice) {
    //   this.trade(OrderSideLowerType.ask, obUnit);
    // }
  }

  private setBalance(): void {
    // 매수중인 총 주문금액 계산
    const totalBidBalance = this.bids.reduce((result, bid) => {
      result += +bid.remaining_volume * +bid.price;
    }, 0);

    console.log('totalBidBalance', totalBidBalance);

    // // 매도중인 총 주문금액 계산
    // const totalAskBalance = this.asks.reduce((result, bid) => {
    //   result += +bid.remaining_volume * +bid.price;
    // }, 0);

    // remaining_volume
  }

  /**
   * 이전 주문과 달라진 상태의 주문 가져오기
   * @param orderDetails
   */
  private getChangedOrders(
    orderDetails: OrderDetailModel[],
  ): OrderDetailModel[] {
    const changedOrders = orderDetails.filter((orderDetail) => {
      const { side, uuid, trades, trade_count } = orderDetail;
      if (side === OrderSideLowerType.bid) {
        // 맨 처음 초기화 된 후라면 return true
        if (!this.bidTrades[uuid]) return true;
        // 이전의 거래내역과 새롭게 받아온 거래내역의 길이가 다르면 return true
        return this.bidTrades[uuid].trade_count !== trade_count;
      } else if (side === OrderSideLowerType.ask) {
        // 맨 처음 초기화 된 후라면 return true
        if (!this.askTrades[uuid]) return true;
        // 이전의 거래내역과 새롭게 받아온 거래내역의 길이가 다르면 return true
        return this.askTrades[uuid].trade_count !== trade_count;
      }
    });

    if (changedOrders.length) {
      logger.info('Order information has changed.', {
        main: 'MyCoin',
        sub: 'compareOrders',
        data: {
          changedOrders,
        },
      });
    } else {
      logger.verbose('Order information has not changed.', {
        main: 'MyCoin',
        sub: 'compareOrders',
      });
    }
    return changedOrders;
  }

  /**
   * 매도, 매수 주문의 모든 uuid 가져오기
   */
  private getAllUuids(): string[] {
    const bidUuids = this.bids.map((bid) => bid.uuid);
    const askUuids = this.asks.map((ask) => ask.uuid);
    const allUuids = bidUuids.concat(askUuids);
    return allUuids;
  }

  /**
   * 체결 watch
   */
  private async watchTrade() {
    try {
      const allUuids = this.getAllUuids();
      if (allUuids.length) {
        // 체결 대기중인 주문이 있을때
        const orderDetailPromises = allUuids.map((uuid) =>
          getOrderDetail({ uuid }),
        );
        const resList: OrderDetailModel[] = await Promise.all(
          orderDetailPromises,
        );
        const changedOrders: OrderDetailModel[] =
          this.getChangedOrders(resList);
        // 변화한 주문이 있다면, 거래 진행하기
        if (changedOrders.length) this.proceed(changedOrders);
      } else {
        // 걸려있는 주문이 하나도 없을때
        this.proceed([]);
      }
    } catch (error) {
      logger.error('Order bid failed.', {
        main: 'MyCoin',
        sub: 'orderBid',
        data: error,
      });
      throw error;
    }
  }

  // 주문정보 세팅, 호가 웹소켓 연결 체크
  private checkReady(): void {
    if (this.chance && this.orderbookWS.isReady) {
      if (this.readyInterval) {
        clearInterval(this.readyInterval);
      }

      // 코인 상태 변경
      this.status = 'started';

      // 프로세스 시가 설정
      const obUnits: WSOrderbookUnitsModel[] = this.orderbookWS.orderbookUnits;
      this.processOpeningPrice = obUnits[0];

      logger.verbose('Ready to work.', {
        main: 'MyCoin',
        sub: 'checkReady',
        data: {
          symbol: this.symbol,
          processOpeningPrice: this.processOpeningPrice,
        },
      });
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
   * @param marketCurrencyLimit 할당된 금액
   */
  public async startTrade(marketCurrencyLimit: number): Promise<void> {
    try {
      // 작업에 할당된 총 금액 설정
      this.marketCurrencyLimit = marketCurrencyLimit;

      // 소켓 연결
      this.connectWebsockets();

      // 주문 가능 정보 세팅
      const result: OrderableInfoModel = await getOrderableInfoByCoin(
        this.mSymbol,
      );
      this.chance = result;

      logger.verbose('Set coin chance.', {
        main: 'MyCoin',
        sub: 'startTrade',
        data: {
          chance: this.chance,
        },
      });

      // 작업 준비 체크 interval
      this.readyInterval = setInterval(() => {
        this.checkReady();
      }, 500);

      // 체결 watch interval
      this.watchTradeInterval = setInterval(() => {
        this.watchTrade();
      }, 1000); // 1초에 한번. (최대 1초당 15회 요청 가능함) (500 이상으로만 설정하기)
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
