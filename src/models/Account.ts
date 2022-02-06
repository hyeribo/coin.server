import logger from '@src/config/winston';
import _ from 'lodash';

import MyCoin from '@src/models/MyCoin';

import { getWaitingOrders, OrderModel } from '@src/services/OrderService';

import AccountService, {
  MyCoinResponseModel,
} from '@src/services/AccountService';

import config from '@src/config';
import errorHandler from '@src/utils/errorHandler';
import { MarketCurrencyType } from '@src/types/common';

const { MAX_PROC_COIN_COUNT, MIN_TRADABLE_BALANCE, INCLUDE_COINS } = config;

type AccountStatusType = 'pending' | 'checking' | 'checked' | 'failed';

const accountService = new AccountService();

export default class Account {
  private status: AccountStatusType = 'pending';
  private marketCurrency; // 기준 화폐 심볼
  private marketCurrencyCoin = {
    balance: 0, // 주문 가능 기준 화폐
    locked: 0, // 주문중 묶여있는 기준 화폐
  };
  private coins: MyCoin[] = []; // 보유중인 코인 (기준화폐 제외)
  private count: number = 0; // 보유중인 코인 수 (기준화폐 제외)
  private enableBalancePerCoin: number = 0;

  constructor(marketCurrency: MarketCurrencyType) {
    this.marketCurrency = marketCurrency;
  }

  /**
   * 보유중인 코인 가져오기
   * @returns 보유중인 코인
   */
  public getCoins(): MyCoin[] {
    return this.coins;
  }

  /**
   * 보유중인 코인 수 가져오기
   * @returns 보유중인 코인 수
   */
  public getCount(): number {
    return this.count;
  }

  /**
   * 보유중인 코인 추가
   * @param coin 추가할 코인
   * @param prevOrders 체결대기중인 주문 목록
   */
  private addCoin(coin: MyCoinResponseModel, prevOrders: OrderModel[]): void {
    const myCoin = new MyCoin(coin, this.enableBalancePerCoin, prevOrders);
    this.coins.push(myCoin);
    this.count++;

    logger.verbose('Added coin.', {
      main: 'Account',
      sub: 'addCoin',
      data: { coin: coin },
    });
  }

  /**
   * 비어있는 코인 추가
   * @param symbol 추가할 코인 심볼
   * @param mSymbol 마켓-심볼 코드
   * @param prevOrders 체결대기중인 주문 목록
   */
  private addEmptyCoin(
    symbol: string,
    mSymbol: string,
    prevOrders: OrderModel[],
  ) {
    const emptyCoinData = {
      symbol,
      balance: 0,
      locked: 0,
      avgBuyPrice: 0,
      avgBuyPriceModified: false,
      marketCurrency: this.marketCurrency,
      mSymbol,
    };
    const emptyCoin = new MyCoin(
      emptyCoinData,
      this.enableBalancePerCoin,
      prevOrders,
    );
    this.coins.push(emptyCoin);
    this.count++;

    logger.verbose('Added empty coin.', {
      main: 'Account',
      sub: 'addEmptyCoin',
      data: { emptyCoin: emptyCoin },
    });
  }

  /**
   * 내 계정 상태 세팅
   * @param status 계정 상태
   */
  private setStatus(status: AccountStatusType) {
    this.status = status;

    logger.verbose("Set account's status.", {
      main: 'Account',
      sub: 'setStatus',
      data: { status: this.status },
    });
  }

  /**
   * 단위화폐 세팅
   * @param coin 단위화폐 코인
   */
  private setMarketCurrency(coin: MyCoinResponseModel) {
    this.marketCurrencyCoin = coin;

    logger.verbose('Set currency.', {
      main: 'Account',
      sub: 'setMarketCurrency',
      data: { marketCurrencyCoin: this.marketCurrencyCoin },
    });
  }

  /**
   * 코인 추가하기 전, 이미 보유한 코인인지 확인
   * @param symbol 확인할 코인 심볼
   * @returns
   */
  private checkHavingCoin(symbol: string) {
    const result = this.coins.some((coin) => {
      return coin.getData().symbol === symbol;
    });

    logger.verbose('Check having coin.', {
      main: 'Account',
      sub: 'checkHavingCoin',
      data: { value: symbol, result },
    });
    return result;
  }

  /**
   * 거래 가능한 상태인지 확인
   */
  private checkTradable(): boolean {
    // 최대 동작할 코인 수를 초과하면 에러
    if (this.count > MAX_PROC_COIN_COUNT) {
      throw new Error('User have too many coins to run this server.');
    }
    // 동작할 코인이 없다면 에러
    if (!this.count) {
      throw new Error('User need 1 or more coins to run this server.');
    }
    // 코인당 거래 가능 금액이 최소 거래 가능 금액 이하면 에러
    if (this.enableBalancePerCoin < MIN_TRADABLE_BALANCE[this.marketCurrency]) {
      throw new Error(
        `Not enough balance to run this server. (enableBalancePerCoin: ${this.enableBalancePerCoin.toLocaleString()})`,
      );
    }

    logger.info('Passed tradable checking.', {
      main: 'Account',
      sub: 'checkTradable',
    });
    return true;
  }

  /**
   * 초기 세팅
   */
  public async init(): Promise<void> {
    try {
      this.setStatus('checking');

      // 내가 가지고있는 코인 리스트 가져오기
      const myAccountInfo: MyCoinResponseModel[] =
        await accountService.getAccountInfo();

      // 체결 대기중인 주문 목록 가져오기
      const waitingOrders: OrderModel[] = await getWaitingOrders(
        this.marketCurrency,
      );
      const prevOrdersByMSymbol = _.groupBy(waitingOrders, 'market');

      // 보유한 코인들을 객체 생성하여 추가
      myAccountInfo.forEach((coin) => {
        if (coin.symbol === this.marketCurrency) {
          this.setMarketCurrency(coin);
        } else {
          // 원화마켓 이외의 경우(비트코인마켓 등) 원화는 거래 코인에 추가하지 않는다.
          if (coin.symbol !== 'KRW') {
            this.addCoin(coin, prevOrdersByMSymbol[coin.mSymbol]);
          }
        }
      });

      // 수동으로 거래설정한 코인 추가
      // (아직 가지고있지는 않지만 워커에 포함시킬 코인)
      INCLUDE_COINS.forEach((symbol) => {
        const isAlreadyHave = this.checkHavingCoin(symbol);
        const mSymbol = `${this.marketCurrency}-${symbol}`;
        if (!isAlreadyHave) {
          this.addEmptyCoin(
            symbol,
            `${this.marketCurrency}-${symbol}`,
            prevOrdersByMSymbol[mSymbol],
          );
        }
      });

      // 코인당 할당된 기준 화폐 금액 설정
      this.enableBalancePerCoin = Math.floor(
        (this.marketCurrencyCoin.balance + this.marketCurrencyCoin.locked) / 3,
      );

      // 거래 가능한 계정인지 확인
      this.checkTradable();

      logger.info('Account initialized.', {
        main: 'Account',
        sub: 'init',
        data: this,
      });
    } catch (error) {
      this.setStatus('failed');
      throw error;
    }
  }
}
