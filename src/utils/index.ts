import { TickerResponseModel } from '@src/websocket';

export function parseTickers(tickers: TickerResponseModel[]): object[] {
  // 거래 가능한 코인만 필터
  const filteredTickers = tickers.filter((ticker) => {
    let passed = true;

    if (ticker.mw !== 'NONE') {
      // 유의종목: 해당없음 외
      return false;
    }
    if (ticker.ms !== 'ACTIVE') {
      // 거래상태: 거래지원가능 외
      return false;
    }
    // if(ticker.its) { // 거래 정지 true
    //   return false;
    // }
    // if(ticker.dd) { // 상장폐지일 not null
    //   return false;
    // }

    return checkPositiveTicker(ticker);
  });

  const parsedTickers = filteredTickers.map((ticker) => ({
    currency: ticker.cd, // 종목코드
    opening: ticker.op, // 시가
    high: ticker.hp, // 고가
    low: ticker.lp, // 저가
    trade: ticker.tp, // 현재가
    prev: ticker.pcp, // 전일 종가
    change: ticker.c, // 전일 대비 (RISE : 상승, EVEN : 보합, FALL : 하락)
  }));

  return parsedTickers;
}

export function checkPositiveTicker(ticker: any) {
  // abv + aav = atv

  // 매수량 - 매도량
  const diff = ticker.abv - ticker.aav;

  // 매수량이 매도량보다 많은가
  const isRise = diff > 0;

  // 매수량과 매도량의 차액의 절대값
  const unsignedDiff = isRise ? diff : diff * -1;

  // 누적거래량 대비 차액 비율
  const diffRate = Math.floor((unsignedDiff / ticker.atv) * 100);

  return diffRate <= 10 && isRise;
}

/**
 * 원화 마켓은 호가 별 주문 가격의 단위가 다르다.
 * 현재가별 주문 가격 단위를 알려준다.
 * @param tradePrice
 * @returns
 */
export function getPriceUnit(tradePrice: number): number {
  if (tradePrice > 2_000_000) {
    return 1_000;
  } else if (tradePrice >= 1_000_000 && tradePrice < 2_000_000) {
    return 500;
  } else if (tradePrice >= 500_000 && tradePrice < 1_000_000) {
    return 100;
  } else if (tradePrice >= 100_000 && tradePrice < 500_000) {
    return 50;
  } else if (tradePrice >= 10_000 && tradePrice < 100_000) {
    return 10;
  } else if (tradePrice >= 1_000 && tradePrice < 10_000) {
    return 5;
  } else if (tradePrice >= 100 && tradePrice < 1_000) {
    return 1;
  } else if (tradePrice >= 10 && tradePrice < 100) {
    return 0.1;
  } else if (tradePrice >= 1 && tradePrice < 10) {
    return 0.01;
  } else if (tradePrice >= 0.1 && tradePrice < 1) {
    return 0.001;
  } else {
    return 0.000_1;
  }
}
