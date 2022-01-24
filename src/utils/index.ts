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
