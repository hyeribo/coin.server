import logger from '@src/config/winston';

import MyCoin from '@src/models/MyCoin';

import AccountService, { MyCoinModel } from '@src/services/AccountService';
import OrderService from '@src/services/OrderService';
import TradeService from '@src/services/TradeService';

import constant from '@src/config/constants';
import errorHandler from '@src/utils/errorHandler';

const { MAX_PROC_COIN_COUNT } = constant;

type AccountStatusType = 'pending' | 'checking' | 'checked' | 'failed';

const accountService = new AccountService();
const orderService = new OrderService();
const tradeService = new TradeService();

export interface AccountModel {
  status: AccountStatusType; // 상태
  count: number; // 보유중인 코인 수
  myCoins: MyCoinModel[]; // 내가 보유중인 코인
  buyingCoins: MyCoinModel[]; // 매수 대기중인 코인
  sellingCoins: MyCoinModel[]; // 매도 대기중인 코인
  currency: {
    balance: number; // 주문 가능 원화
    locked: number; // 주문중 묶여있는 원화
  };
}

export default class Account implements AccountModel {
  status: AccountStatusType = 'pending';
  count: number = 0;
  myCoins: MyCoinModel[] = [];
  buyingCoins: MyCoinModel[] = [];
  sellingCoins: MyCoinModel[] = [];
  currency = { balance: 0, locked: 0 };

  /**
   * 초기 세팅
   */
  async init(): Promise<void> {
    try {
      this.setStatus('checking');

      const myAccountInfo: MyCoinModel[] =
        await accountService.getAccountInfo();

      myAccountInfo.forEach((coin) => {
        if (coin.currency === 'KRW') {
          this.setCurrency(coin);
        } else {
          const myCoin = new MyCoin(coin);
          this.addMyCoin(myCoin);
        }
      });

      // 최대 동작할 코인 수 체크
      if (this.count > MAX_PROC_COIN_COUNT) {
        throw new Error('Too many coins to run the server.');
      }

      logger.info('Account initialized.', {
        main: 'Account',
        sub: 'init',
        data: this,
      });

      this.setStatus('checked');
    } catch (error) {
      errorHandler(error);
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
   * 화폐 세팅
   * @param coin 원화 코인
   */
  setCurrency(coin: MyCoinModel) {
    this.currency = coin;

    logger.verbose('Set currency.', {
      main: 'Account',
      sub: 'setCurrency',
      data: { currency: this.currency },
    });
  }

  /**
   * 보유중인 코인 추가
   * @param coin 추가할 코인
   */
  addMyCoin(coin: MyCoinModel) {
    this.myCoins.push(coin);
    this.count++;

    logger.verbose('Added coin.', {
      main: 'Account',
      sub: 'addMyCoin',
      data: { coin: coin },
    });
  }

  /**
   * 매수 주문중인 코인 추가
   * @param coin 추가할 코인
   */
  addBuyingCoin(coin: MyCoinModel) {
    this.buyingCoins.push(coin);

    logger.verbose('Added buying coin.', {
      main: 'Account',
      sub: 'addBuyingCoin',
      data: { buyingCoins: this.buyingCoins },
    });
  }

  /**
   * 매도 주문중인 코인 추가
   * @param coin 추가할 코인
   */
  addSellingCoin(coin: MyCoinModel) {
    this.sellingCoins.push(coin);

    logger.verbose('Added selling coin.', {
      main: 'Account',
      sub: 'addSellingCoin',
      data: { sellingCoins: this.sellingCoins },
    });
  }
}
