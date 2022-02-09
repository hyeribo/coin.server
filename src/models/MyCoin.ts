import logger from '@src/config/winston';
import { v4 as uuid } from 'uuid';

import OrderbookWS, { WSOrderbookUnitModel } from '@src/websocket/OrderbookWS';
import Queue from '@src/utils/Queue';

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
import { getPriceUnit } from '@src/utils';

import config from '@src/config';

const { MIN_ORDER_AMOUNT } = config;

export default class MyCoin {
  public status: 'stopped' | 'started' = 'stopped';

  private queue: Queue; // 작업 큐

  // tickerWS: TickerWS; // 현재가 웹소켓
  // tradeWS: TradeWS; // 체결 웹소켓
  orderbookWS: OrderbookWS; // 호가 웹소켓

  readyInterval?: ReturnType<typeof setInterval>; // 준비상태 체크 인터벌
  watchTradeInterval?: ReturnType<typeof setInterval>; // 주문 체결 감시 인터벌

  public symbol; // 화폐를 의미하는 영문 대문자 코드
  private marketCurrency; // 마켓 심볼
  private mSymbol; // 마켓-심볼 코드

  private bids: OrderModel[] = []; // 매수 주문 대기 정보
  private asks: OrderModel[] = []; // 매도 주문 대기 정보
  private bidTrades: { [uuid: string]: OrderTradeModel[] } = {}; // 매수 체결 정보
  private askTrades: { [uuid: string]: OrderTradeModel[] } = {}; // 매수 체결 정보

  private processOpeningPrice!: WSOrderbookUnitModel; // 프로세스 시작시 시가
  private currentBidTrade: OrderTradeModel = {} as OrderTradeModel; // 최근 매수 체결 정보
  private currentAskTrade: OrderTradeModel = {} as OrderTradeModel; // 최근 매도 체결 정보

  private bid_fee!: number; // 매수 수수료 비율
  private ask_fee!: number; // 매도 수수료 비율
  private priceUnit: number = 0; // 주문 가격 단위

  // 보유한 코인 정보
  private ask_account!: {
    balance: number;
    locked: number;
    avg_buy_price: number;
    avg_buy_price_modified: boolean;
  };
  private marketCurrencyLimit: number; // 작업에 할당된 총 금액
  private marketCurrencyBalance: number = 0; // 매수 가능 금액
  private marketCurrencyLocked: number = 0; // 매수 대기중인 금액

  constructor(
    obj: MyCoinResponseModel,
    marketCurrencyLimit: number,
    prevOrders?: OrderModel[],
  ) {
    this.queue = new Queue(); // 큐 생성

    this.symbol = obj.symbol;
    this.marketCurrency = obj.marketCurrency;
    this.mSymbol = obj.mSymbol;

    this.marketCurrencyLimit = marketCurrencyLimit;
    this.orderbookWS = new OrderbookWS(this.mSymbol);

    if (prevOrders) {
      prevOrders.forEach((prevOrder) => {
        const { side } = prevOrder;
        if (prevOrder.side === OrderSideLowerType.bid) {
          this.bids.push(prevOrder);
        } else if (side === OrderSideLowerType.ask) {
          this.asks.push(prevOrder);
        }
      });
    }
  }

  /**
   * @param volume 매수 주문량
   * @param price 유닛당 매수 주문 가격 (지정가 필수, 시장가 매수시 필수)
   * @returns 성공여부
   */
  private async orderBid(data: {
    volume: number;
    price: number;
  }): Promise<boolean> {
    try {
      const params = {
        market: this.mSymbol,
        side: OrderSideLowerType.bid,
        volume: data.volume.toString(),
        price: data.price,
        ord_type: 'limit', // 시장가 주문
        // identifier: uuid(),
      };

      logger.info('Order bid requested.', {
        main: 'MyCoin',
        sub: 'orderBid',
        data: params,
      });

      const res = await order(params);
      this.bids.push(res);

      logger.info('Order bid success.', {
        main: 'MyCoin',
        sub: 'orderBid',
        data: res,
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
   * @param volume 매도 주문량 (지정가 필수, 시장가 매도시 필수)
   * @param price 유닛당 매도 주문 가격
   * @returns 성공여부
   */
  private async orderAsk(data: {
    volume: number;
    price: number;
  }): Promise<boolean> {
    try {
      const params = {
        market: this.mSymbol,
        side: OrderSideLowerType.ask,
        volume: data.volume.toFixed(1),
        price: data.price,
        ord_type: 'limit', // 시장가 주문
        // identifier: uuid(),
      };

      logger.info('Order asks requested.', {
        main: 'MyCoin',
        sub: 'orderAsk',
        data: params,
      });

      const res = await order(params);
      this.asks.push(res);

      logger.info('Order ask success.', {
        main: 'MyCoin',
        sub: 'orderAsk',
        data: { request: params, respose: res },
      });
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
   * 매도/매수 수수료율 설정
   */
  private async setTradeFee(): Promise<void> {
    try {
      // 주문 가능 정보 가져오기
      const res: OrderableInfoModel = await getOrderableInfoByCoin(
        this.mSymbol,
      );
      this.bid_fee = +res.bid_fee;
      this.ask_fee = +res.ask_fee;

      logger.verbose('Initialized coin info.', {
        main: 'MyCoin',
        sub: 'initCoinInfo',
        data: {
          mSymbol: this.mSymbol,
          bid_fee: this.bid_fee,
          ask_fee: this.ask_fee,
          res,
        },
      });
    } catch (error) {
      logger.error('Initialize coin info failed.', {
        main: 'MyCoin',
        sub: 'initCoinInfo',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 주문가능정보 업데이트
   */
  private async updateCoinInfo(): Promise<void> {
    try {
      // 주문 가능 정보 가져오기
      const res: OrderableInfoModel = await getOrderableInfoByCoin(
        this.mSymbol,
      );

      const { ask_account } = res;
      // 매도할때 사용하는 코인 정보
      this.ask_account = {
        balance: +ask_account.balance,
        locked: +ask_account.locked,
        avg_buy_price: +ask_account.avg_buy_price,
        avg_buy_price_modified: ask_account.avg_buy_price_modified,
      };
      // 매수할때 사용하는 거래화폐 정보
      const marketCurrencyLocked = this.bids.reduce((result, bid) => {
        result += +bid.locked;
        return result;
      }, 0);
      this.marketCurrencyLocked = marketCurrencyLocked;
      this.marketCurrencyBalance =
        this.marketCurrencyLimit - this.marketCurrencyLocked;

      logger.verbose('Updated coin info.', {
        main: 'MyCoin',
        sub: 'updateCoinInfo',
        data: {
          mSymbol: this.mSymbol,
          ask_account: this.ask_account,
          marketCurrencyLocked: this.marketCurrencyLocked,
          marketCurrencyBalance: this.marketCurrencyBalance,
          marketCurrencyLimit: this.marketCurrencyLimit,
        },
      });
    } catch (error) {
      logger.error('Update coin info failed.', {
        main: 'MyCoin',
        sub: 'updateCoinInfo',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 추가 매수 가능한 상태인지 체크
   */
  private checkEnableBid(): false | { volume: number; price: number } {
    // 최근 매도 시세
    const currentAskPrice =
      +this.currentAskTrade.price || this.processOpeningPrice.ap;
    // 매수 요청할 금액
    const bidPrice = currentAskPrice - this.priceUnit;
    // 매수 수수료
    const totalFee = this.marketCurrencyBalance * this.bid_fee;
    // 총 매수할 코인 수
    const bidVolume = Math.floor(
      (this.marketCurrencyBalance - totalFee) / bidPrice,
    );
    // 최소 거래 금액 이상인지 체크
    const isEnableOrder =
      this.marketCurrencyBalance - totalFee > MIN_ORDER_AMOUNT;
    if (!isEnableOrder) {
      logger.info('Unable to bid.', {
        main: 'MyCoin',
        sub: 'checkEnableBid',
        data: {
          volume: bidVolume,
          price: bidPrice,
          totalBidPrice: this.marketCurrencyBalance,
          isEnableOrder,
        },
      });
      return false;
    }
    // 매수시 얻을 이익
    const profit = this.priceUnit * bidVolume - totalFee;
    // 거래 수수료보다 이익이 큰지 체크
    const isProfitable = profit > totalFee;
    if (!isProfitable) {
      logger.info('Not profitable to bid.', {
        main: 'MyCoin',
        sub: 'checkEnableBid',
        data: {
          volume: bidVolume,
          price: bidPrice,
          profit,
          isProfitable,
        },
      });
      return false;
    }

    logger.info('Passed enable bid checking.', {
      main: 'MyCoin',
      sub: 'checkEnableBid',
      data: {
        volume: bidVolume,
        price: this.marketCurrencyBalance,
      },
    });

    return {
      volume: bidVolume,
      price: bidPrice,
    };
  }

  /**
   * 추가 매도 가능한 상태인지 체크
   */
  private checkEnableAsk(): false | { volume: number; price: number } {
    // 최근 매수 시세
    const currentBidPrice =
      +this.currentBidTrade.price || this.processOpeningPrice.bp;
    // 매도 요청할 금액
    const askPrice = currentBidPrice + this.priceUnit;
    // 총 매도할 금액
    const totalAskPrice = this.ask_account.balance * askPrice;
    // 최소 거래 금액 이상인지 체크
    const isEnableOrder = totalAskPrice > MIN_ORDER_AMOUNT;
    if (!isEnableOrder) {
      logger.info('Unable to ask.', {
        main: 'MyCoin',
        sub: 'checkEnableAsk',
        data: {
          volume: this.ask_account.balance,
          price: askPrice,
          totalAskPrice,
          isEnableOrder,
        },
      });
      return false;
    }
    // 매도 수수료
    const totalFee = totalAskPrice * this.ask_fee;
    // 매도시 얻을 이익
    const profit = this.priceUnit * this.ask_account.balance - totalFee;
    // 거래 수수료보다 이익이 큰지 체크
    const isProfitable = profit > totalFee;
    if (!isProfitable) {
      logger.info('Not profitable to ask.', {
        main: 'MyCoin',
        sub: 'checkEnableAsk',
        data: {
          volume: this.ask_account.balance,
          price: askPrice,
          profit,
          isProfitable,
        },
      });
      return false;
    }

    logger.info('Passed enable ask checking.', {
      main: 'MyCoin',
      sub: 'checkEnableAsk',
      data: {
        volume: this.ask_account.balance,
        price: askPrice,
      },
    });

    return {
      volume: this.ask_account.balance,
      price: askPrice,
    };
  }

  /**
   * 거래 진행하기
   */
  private async proceed(changedOrders: OrderDetailModel[] = []): Promise<void> {
    try {
      logger.info('Proceed started.', {
        main: 'MyCoin',
        sub: 'proceed',
      });
      // 주문 가능 정보 업데이트
      await this.updateCoinInfo();

      // 주문 전, 변화한 주문 정보 반영하기
      changedOrders.forEach((changedOrder) => {
        const { trades, ...orderInfo } = changedOrder;
        const { side, uuid, remaining_volume } = orderInfo;

        if (side === OrderSideLowerType.bid) {
          // 체결된 주문이 매수주문인경우
          if (+remaining_volume === 0) {
            // 주문이 완전히 체결된 경우 경우 매수 정보 삭제
            this.bids = this.bids.filter((bid) => bid.uuid !== uuid);
            delete this.bidTrades[uuid];
          } else {
            // 주문의 일부만 체결된 경우 매수 정보 업데이트
            this.bids.forEach((bid) => {
              if (bid.uuid === uuid) {
                bid = Object.assign(bid, orderInfo);
              }
            });
            this.bidTrades[uuid] = trades;
          }
          this.currentBidTrade = trades[trades.length - 1];
        } else if (side === OrderSideLowerType.ask) {
          // 체결된 주문이 매도주문인경우
          if (+remaining_volume === 0) {
            // 주문이 완전히 체결된 경우 경우 매도 정보 삭제
            this.asks = this.asks.filter((ask) => ask.uuid !== uuid);
            delete this.askTrades[uuid];
          } else {
            // 주문의 일부만 체결된 경우 매도 정보 업데이트
            this.bids.forEach((bid) => {
              if (bid.uuid === uuid) {
                bid = Object.assign(bid, orderInfo);
              }
            });
            this.bidTrades[uuid] = trades;
          }
          this.currentAskTrade = trades[trades.length - 1];
        }
      });

      // 주문가능 액수 계산 후 주문하기
      const works = [];
      // 매수 가능하면 매수요청 work 추가
      if (this.bids.length < 2) {
        const enableBidInfo = this.checkEnableBid();
        if (enableBidInfo) {
          logger.info('Pushed bid work.', {
            main: 'MyCoin',
            sub: 'proceed',
          });
          // works.push(() => this.orderBid(enableBidInfo));
          await this.orderBid(enableBidInfo);
        }
      }
      // 매도 가능하면 매도요청 work 추가
      if (this.asks.length < 2) {
        const enableAskInfo = this.checkEnableAsk();
        if (enableAskInfo) {
          logger.info('Pushed ask work.', {
            main: 'MyCoin',
            sub: 'proceed',
          });
          // works.push(() => this.orderAsk(enableAskInfo));
          await this.orderAsk(enableAskInfo);
        }
      }
      // await Promise.all(works);
    } catch (error) {
      logger.error('Error occured while proceed.', {
        main: 'MyCoin',
        sub: 'proceed',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 이전 주문과 달라진 상태의 주문 가져오기
   * @param orderDetails
   */
  private getChangedOrders(
    orderDetails: OrderDetailModel[],
  ): OrderDetailModel[] {
    const changedOrders = orderDetails.filter((orderDetail) => {
      const { side, uuid, trade_count } = orderDetail;
      if (side === OrderSideLowerType.bid) {
        // 맨 처음 초기화 된 후라면 return true
        if (!this.bidTrades[uuid]) return true;
        // 이전의 거래내역과 새롭게 받아온 거래내역의 길이가 다르면 return true
        return this.bidTrades[uuid].length !== trade_count;
      } else if (side === OrderSideLowerType.ask) {
        // 맨 처음 초기화 된 후라면 return true
        if (!this.askTrades[uuid]) return true;
        // 이전의 거래내역과 새롭게 받아온 거래내역의 길이가 다르면 return true
        return this.askTrades[uuid].length !== trade_count;
      }
    });

    if (changedOrders.length) {
      logger.info('Order information has changed. (or the first task)', {
        main: 'MyCoin',
        sub: 'compareOrders',
        data: {
          changedOrders,
          bids: this.bids,
          bidTrades: this.bidTrades,
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
        logger.verbose('Orders exist.', {
          main: 'MyCoin',
          sub: 'watchTrade',
          data: { allUuids },
        });
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
        logger.verbose('Detected change. (start proceed)', {
          main: 'MyCoin',
          sub: 'watchTrade',
          data: { changedOrders },
        });
        if (changedOrders.length) {
          this.queue.enqueue(() => this.proceed(changedOrders));
        }
      } else {
        // 걸려있는 주문이 하나도 없을때
        // this.proceed();
        logger.verbose('No order exist. (start proceed)', {
          main: 'MyCoin',
          sub: 'watchTrade',
        });
        this.queue.enqueue(() => this.proceed());
      }
    } catch (error) {
      logger.error('watchTrade failed.', {
        main: 'MyCoin',
        sub: 'watchTrade',
        data: error,
      });
      throw error;
    }
  }

  /**
   * 작업 시작 준비 여부 watch
   */
  private checkReady(onReady: () => any): void {
    if (this.orderbookWS.isReady) {
      if (this.readyInterval) {
        clearInterval(this.readyInterval);
      }
      onReady();

      logger.info('Ready to work.', {
        main: 'MyCoin',
        sub: 'checkReady',
        data: {
          symbol: this.symbol,
          status: this.status,
          processOpeningPrice: this.processOpeningPrice,
          priceUnit: this.priceUnit,
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
   * 거래 시작
   * @param marketCurrencyLimit 코인에 할당된 금액
   */
  public async startTrade(marketCurrencyLimit: number): Promise<void> {
    try {
      // 작업에 할당된 총 금액 설정
      this.marketCurrencyLimit = marketCurrencyLimit;

      // 소켓 연결
      this.connectWebsockets();

      // 수수료율 설정
      await this.setTradeFee();

      // 작업 준비 체크 interval
      this.readyInterval = setInterval(() => {
        this.checkReady(() => {
          // 작업 준비가 되었다면 코인 상태 변경 & 프로세스 시가 설정
          this.status = 'started';

          const firstObUnit: WSOrderbookUnitModel =
            this.orderbookWS.orderbookUnits[0];
          this.processOpeningPrice = firstObUnit;

          this.priceUnit = getPriceUnit(firstObUnit.ap);

          // 체결 watch interval
          this.watchTradeInterval = setInterval(() => {
            this.watchTrade();
          }, 1000); // 1초에 한번. (최대 1초당 15회 요청 가능함) (500 이상으로만 설정하기)
        });
      }, 500);
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
   * 거래 중지
   * @param mSymbol
   */
  public stopTrade() {
    logger.verbose('Stop trade.', {
      main: 'MyCoin',
      sub: 'stopTrade',
      data: {
        mSymbol: this.mSymbol,
      },
    });

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
}
