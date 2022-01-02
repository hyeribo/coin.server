import logger from '@src/config/winston';
import { MyCoinModel, MyCoin } from '@src/models/MyCoin';
import AccountService from '@src/services/AccountService';

type AccountStatusType = 'pending' | 'checking' | 'checked' | 'failed';

export interface AccountModel {
  status: AccountStatusType;
  count: number; // 보유중인 코인 수
  myCoins: MyCoinModel[]; // 내가 보유중인 코인
  buyingCoins: MyCoinModel[]; // 매수 대기중인 코인
  sellingCoins: MyCoinModel[]; // 매도 대기중인 코인
  orderableWon: number; // 주문 가능 원화
}

export default class Account implements AccountModel {
  status: AccountStatusType = 'pending';
  count: number = 0;
  myCoins: MyCoinModel[] = [];
  buyingCoins: MyCoinModel[] = [];
  sellingCoins: MyCoinModel[] = [];
  orderableWon: number = 0;

  /**
   * 초기 세팅
   * @param accountInfo 계정이 가진 모든 코인
   */
  async init(): Promise<void> {
    try {
      this.setStatus('checking');
      const myAccountService = new AccountService();

      const myAccountInfo: MyCoinModel[] =
        await myAccountService.getAccountInfo();

      myAccountInfo.forEach((coin) => {
        if (coin.currency === 'KRW') {
          const parsedWon: number = Math.floor(coin.balance);
          this.setOrderableWon(parsedWon);
        } else {
          const myCoin = new MyCoin(coin);
          this.addMyCoin(myCoin);
        }
      });

      logger.info('Initialized.', {
        main: 'Account',
        sub: 'init',
        data: this,
      });
      this.setStatus('checked');
    } catch (error) {
      logger.error('Initialization failed.', {
        main: 'Account',
        sub: 'init',
        data: error,
      });

      this.setStatus('failed');
    }
  }

  /**
   * 내 계정 상태 세팅
   * @param status 계정 상태
   */
  setStatus(status: AccountStatusType) {
    this.status = status;

    logger.verbose('Set status.', {
      main: 'Account',
      sub: 'setStatus',
      data: { status: this.status },
    });
  }

  /**
   * 주문 가능한 원화 세팅
   * @param value 주문 가능한 원화 액수
   */
  setOrderableWon(value: number) {
    this.orderableWon = value;

    logger.verbose('Set orderableWon.', {
      main: 'Account',
      sub: 'setOrderableWon',
      data: { orderableWon: this.orderableWon },
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
      data: { myCoins: this.myCoins, count: this.count },
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
