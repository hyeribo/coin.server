import logger from '@src/config/winston';

import MyCoin, { MyCoinModel } from '@src/models/MyCoin';

import AccountService, {
  MyCoinResponseModel,
} from '@src/services/AccountService';
import OrderService from '@src/services/OrderService';
import TradeService from '@src/services/TradeService';

import config from '@src/config';
import errorHandler from '@src/utils/errorHandler';
import { MarketCurrencyType } from '@src/types/common';

const { MAX_PROC_COIN_COUNT, MIN_TRADABLE_BALANCE, INCLUDE_COINS } = config;

type AccountStatusType = 'pending' | 'checking' | 'checked' | 'failed';

const accountService = new AccountService();
const orderService = new OrderService();
const tradeService = new TradeService();

export interface AccountModel {
  init(): Promise<void>;
  getCoins(): MyCoinModel[];
  getCount(): number;
  addCoin(coin: MyCoinResponseModel): void;
  checkTradable(): boolean;
}

export default class Account implements AccountModel {
  private status: AccountStatusType = 'pending';
  private marketCurrency; // 기준 화폐 심볼
  private marketCurrencyCoin = {
    balance: 0, // 주문 가능 기준 화폐
    locked: 0, // 주문중 묶여있는 기준 화폐
  };
  private coins: MyCoin[] = []; // 보유중인 코인 (기준화폐 제외)
  private count: number = 0; // 보유중인 코인 수 (기준화폐 제외)

  constructor(marketCurrency: MarketCurrencyType) {
    this.marketCurrency = marketCurrency;
  }

  /**
   * 보유중인 코인 가져오기
   * @returns 보유중인 코인
   */
  public getCoins() {
    return this.coins;
  }

  /**
   * 보유중인 코인 수 가져오기
   * @returns 보유중인 코인 수
   */
  public getCount() {
    return this.count;
  }

  /**
   * 보유중인 코인 추가
   * @param coin 추가할 코인
   */
  public addCoin(coin: MyCoinResponseModel) {
    const myCoin = new MyCoin(coin);
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
   */
  public addEmptyCoin(symbol: string) {
    const emptyCoinData = {
      symbol,
      balance: 0,
      locked: 0,
      avgBuyPrice: 0,
      avgBuyPriceModified: false,
      marketCurrency: this.marketCurrency,
    };
    const emptyCoin = new MyCoin(emptyCoinData);
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
  public checkTradable(): boolean {
    // 최대 동작할 코인 수를 초과하면 에러
    if (this.count > MAX_PROC_COIN_COUNT) {
      throw new Error('User have too many coins to run this server.');
    }

    // 최소 동작할 코인 수보다 현재 가진 코인 수가 적다면,
    // INCLUDE_COINS 에 들어있는 코인도 포함시킨다. (아직 가지고있지는 않지만 프로세스에 포함시킬 코인)
    const diff = MAX_PROC_COIN_COUNT - this.count;
    if (diff > 0) {
      INCLUDE_COINS.forEach((symbol) => {
        if (this.count < MAX_PROC_COIN_COUNT) {
          const isAlreadyHave = this.checkHavingCoin(symbol);
          if (!isAlreadyHave) {
            this.addEmptyCoin(symbol);
          }
        }
      });
    }

    // 동작할 코인이 없다면 에러
    if (!this.count) {
      throw new Error('User need 1 or more coins to run this server.');
    }

    // 기준화폐가 최소 거래 가능 이상인지 확인
    const minTradableBalance = MIN_TRADABLE_BALANCE[this.marketCurrency];
    if (
      this.marketCurrencyCoin.balance + this.marketCurrencyCoin.locked >=
      minTradableBalance
    ) {
      return true;
    } else {
      throw new Error('Not enough balance to trade.');
    }
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

      myAccountInfo.forEach((coin) => {
        if (coin.symbol === this.marketCurrency) {
          this.setMarketCurrency(coin);
        } else {
          // 원화마켓 이외의 경우(비트코인마켓 등) 원화는 거래 코인에 추가하지 않는다.
          if (coin.symbol !== 'KRW') {
            this.addCoin(coin);
          }
        }
      });

      // 거래 가능한 계정인지 확인
      this.checkTradable();

      logger.info('Account initialized.', {
        main: 'Account',
        sub: 'init',
        data: this,
      });
    } catch (error) {
      this.setStatus('failed');
      errorHandler(error, { main: 'Account', sub: 'init' });
      throw error;
    }
  }
}
