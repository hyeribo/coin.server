import logger from '@src/config/winston';

import MyCoin from '@src/models/MyCoin';

import AccountService, {
  MyCoinResponseModel,
} from '@src/services/AccountService';
import OrderService from '@src/services/OrderService';
import TradeService from '@src/services/TradeService';

import constant from '@src/config/constants';
import errorHandler from '@src/utils/errorHandler';
import { MarketCurrencyType } from '@src/types/common';

const { MAX_PROC_COIN_COUNT, MIN_TRADABLE_BALANCE } = constant;

type AccountStatusType = 'pending' | 'checking' | 'checked' | 'failed';

const accountService = new AccountService();
const orderService = new OrderService();
const tradeService = new TradeService();

export interface AccountModel {
  status: AccountStatusType; // 상태
  marketCurrency: MarketCurrencyType; // 기준 화폐
  marketCurrencyCoin: {
    balance: number; // 주문 가능 원화
    locked: number; // 주문중 묶여있는 원화
  };
  // coins: MyCoinResponseModel[]; // 내가 보유중인 코인
  // count: number; // 보유중인 코인 수
  getCoins(): MyCoinResponseModel[];
  getCount(): number;
}

export default class Account implements AccountModel {
  status: AccountStatusType = 'pending';
  marketCurrency;
  marketCurrencyCoin = { balance: 0, locked: 0 };
  private coins: MyCoin[] = [];
  private count: number = 0;

  constructor(marketCurrency: MarketCurrencyType) {
    this.marketCurrency = marketCurrency;
  }

  public getCoins() {
    return this.coins;
  }

  public getCount() {
    return this.count;
  }

  /**
   * 초기 세팅
   */
  async init(): Promise<void> {
    try {
      this.setStatus('checking');

      const myAccountInfo: MyCoinResponseModel[] =
        await accountService.getAccountInfo();

      myAccountInfo.forEach((coin) => {
        if (coin.currency === this.marketCurrency) {
          this.setMarketCurrency(coin);
        } else {
          // 원화마켓 이외의 경우(비트코인마켓 등) 원화는 거래 코인에 추가하지 않는다.
          if (coin.currency !== 'KRW') {
            this.addMyCoin(coin);
          }
        }
      });

      logger.info('Account initialized.', {
        main: 'Account',
        sub: 'init',
        data: this,
      });
    } catch (error) {
      errorHandler(error, { main: 'Account', sub: 'init' });
      this.setStatus('failed');
    }
  }

  /**
   * 내 계정 상태 세팅
   * @param status 계정 상태
   */
  setStatus(status: AccountStatusType) {
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
  setMarketCurrency(coin: MyCoinResponseModel) {
    this.marketCurrencyCoin = coin;

    logger.verbose('Set currency.', {
      main: 'Account',
      sub: 'setMarketCurrency',
      data: { marketCurrencyCoin: this.marketCurrencyCoin },
    });
  }

  /**
   * 거래 가능한 상태인지 확인
   */
  checkTradable(): boolean {
    // 최대 동작할 코인 수 확인
    if (this.count > MAX_PROC_COIN_COUNT) {
      throw new Error('User have too many coins to run the server.');
    }

    if (this.coins.length > 0) return true;

    // 기준화폐가 최소 거래 가능 이상인지 확인
    const minTradableBalance = MIN_TRADABLE_BALANCE[this.marketCurrency];
    if (
      this.marketCurrencyCoin.balance + this.marketCurrencyCoin.locked >=
      minTradableBalance
    ) {
      return true;
    }
    return false;
  }

  /**
   * 보유중인 코인 추가
   * @param coin 추가할 코인
   */
  addMyCoin(coin: MyCoinResponseModel) {
    const myCoin = new MyCoin(this.marketCurrency, coin);
    this.coins.push(myCoin);
    this.count++;

    logger.verbose('Added coin.', {
      main: 'Account',
      sub: 'addMyCoin',
      data: { coin: coin },
    });
  }
}
