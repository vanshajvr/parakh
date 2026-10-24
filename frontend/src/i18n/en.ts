/**
 * English text for the translated screens (decision D-034). This file is the source: `hi.ts` must
 * have the same shape, so a missing Hindi string fails the type check. Functions take the values
 * a sentence needs, because word order differs between the two languages.
 */

const pct = (x: number, digits = 1) => `${(Math.abs(x) * 100).toFixed(digits)}%`

export const en = {
  locale: 'en-IN',

  layout: {
    skip: 'Skip to content',
    home: 'Parakh home',
    nav: { today: 'Today', stocks: 'Stocks', record: 'Track record', recordShort: 'Record', learn: 'How it works', learnShort: 'Learn' },
    install: 'Install app',
    offline: "You're offline. Showing the last calls Parakh saved on this device.",
    disclaimer: 'Parakh is an educational project. It is not investment advice and is not registered with SEBI.',
    language: 'Language',
    englishOnly: '',
    glossary: 'Glossary of terms',
  },

  states: {
    loading: (what: string) => `Loading ${what}…`,
    slow: "Parakh runs on free hosting that sleeps when nobody's using it. Waking up can take up to a minute.",
    loadError: (what: string) => `We couldn't load ${what}. The connection or our server may be having a moment.`,
    tryAgain: 'Try again',
  },

  format: {
    closeLabel: (weekday: string, day: string) => `${weekday}'s close, ${day}`,
  },

  lean: { bullish: 'Bullish lean', bearish: 'Bearish lean', no_call: 'No call' },
  confidence: (label: string) => label,

  today: {
    loadingWhat: "today's calls",
    title: "Today's calls",
    infoAria: 'What do these calls mean?',
    asOf: (close: string) => `${close} · looking 5 trading days ahead`,
    questionHeading: 'The question every call answers',
    question: 'Will this stock do better than a NIFTY 50 index fund over the next 5 trading days?',
    questionNote: 'A lean is not a buy or sell instruction. "No call" means the data isn\'t clear enough to say.',
    stale: (close: string) => `Data may be delayed: these calls are from ${close}.`,
    callsAria: "Today's calls",
    filterAria: 'Filter calls',
    filters: { calls: 'Calls', bullish: 'Bullish', bearish: 'Bearish' },
    keyNumbersAria: 'Key numbers',
    tiles: {
      liveRecord: 'Live record',
      day: (n: number) => `Day ${n}`,
      starting: 'Starting',
      publishedScored: (published: string, scored: string) => `${published} published · ${scored} scored`,
      rightSoFar: 'Right so far',
      acrossScored: (n: string) => `Across ${n} scored live calls`,
      firstResults: 'First results 5 trading days after the first calls',
      inTesting: 'In testing',
      inTestingDetail: 'Of calls right, 2019–2026 · a coin flip gets 50%',
      todaysCalls: "Today's calls",
      soon: 'Soon',
      split: (bullish: number, bearish: number, none: number) => `${bullish} bullish · ${bearish} bearish · ${none} no call`,
      publishedAfterClose: 'Published after each close, before the next open',
    },
    howToRead: {
      title: 'How to read a call',
      rows: [
        ['Lean', 'Likely to beat or lag the index. Not a buy or sell instruction.'],
        ['Edge', 'Every call has a slight edge at best. Its receipt shows how often calls were right in testing.'],
        ['Factors', 'What moved the call most, in plain words.'],
        ['No call', "We'd rather say nothing than guess."],
      ] as [string, string][],
    },
    liveRecord: {
      label: 'Live record',
      summary: (published: string, scored: string) => ` · ${published} published · ${scored} scored`,
      body: "We're building our record in public. Every call is published before the market opens and can never be edited.",
      firstResults: ' First results arrive 5 trading days after the first calls.',
      liveSoFar: 'Live so far:',
      rightOf: (rate: string) => `right ${rate} of the time`,
      across: (n: string) => ` across ${n} calls.`,
      inTesting: 'In testing:',
      coinFlip: ' (coin flip: 50%).',
      fullRecord: 'See the full track record →',
    },
    firstCalls: {
      title: 'Our first calls are on their way',
      body: 'Calls are published every trading day after the market closes, before the next open. Until the first ones appear, you can see how the method did in testing.',
      link: 'See the track record →',
    },
  },

  next: {
    in: (weekday: string, wait: string) => `Next calls after ${weekday}'s close · in ${wait}`,
    due: 'Next calls are due: they usually appear by 18:30 IST',
    duration: (days: number, hours: number, minutes: number) =>
      days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`,
  },

  suggest: {
    title: 'What to look at next',
    strongestRule: (symbol: string, move: string, ahead: boolean, lean: string) =>
      `${symbol} ran ${move} ${ahead ? 'ahead of' : 'behind'} the others last week. See why it has a ${lean.toLowerCase()}`,
    strongest: (symbol: string) => `${symbol} has today's clearest call. See why`,
    closest: (symbol: string, share: number) => `${symbol} came closest to a call without getting one (${Math.round(share * 100)}% of the way)`,
    open: (symbol: string, gap: string, day: number, total: number) => `${symbol}'s call is ${gap} so far, day ${day} of ${total}`,
    mover: (symbol: string, change: string, up: boolean) => `${symbol} ${up ? 'rose' : 'fell'} ${change} at the last close, the biggest move among Parakh's 20`,
    glossary: 'New to the words? The glossary explains each one with an example',
  },

  noCall: {
    title: (n: number) => `No call on ${n} stocks`,
    generic: "The signals are mixed or weak, so we'd rather say nothing than guess.",
    intro: "Parakh's rule only speaks up about the stocks that moved furthest from the average of the 20 last week. These stayed too close to the average for a call.",
    move: (move: number) => (Math.abs(move) < 0.0005 ? 'In line with the average' : `${pct(move)} ${move > 0 ? 'ahead of' : 'behind'} the average`),
    callsFrom: (from: number) => `calls started at ${pct(from)}`,
    noneThisSide: 'no calls on this side today',
    closeness: (symbol: string, share: number) => `${symbol} is ${Math.round(share * 100)}% of the way to a call`,
  },

  call: {
    headline: {
      bullish: 'Leaning towards outperforming the NIFTY 50.',
      bearish: 'Leaning towards lagging the NIFTY 50. The data suggests waiting.',
      no_call: 'No clear edge today: the signals are mixed or weak.',
    },
    chanceLags: (p: string) => `${p} chance it lags the index`,
    chanceBeats: (p: string) => `${p} chance it beats the index`,
    rightInTesting: (rate: string) => `${rate} right in testing`,
    belowCoinFlip: (symbol: string, rate: string) => `On ${symbol}: ${rate} in testing, below a coin flip`,
    biggestFactors: 'Biggest factors',
    noStandout: 'No single standout factor.',
    reversalLink: 'Why might this point the other way? About reversals →',
    open: (symbol: string) => `Open ${symbol} →`,
    range: (low: number, high: number) => `likely ${low}–${high}%`,
    receiptAll: (rate: string, n: string) => `Calls were right ${rate} of the time across ${n} testing calls.`,
    receiptStock: (name: string, rate: string, n: string, range: string | null) =>
      `On ${name} specifically: ${rate} over ${n} calls${range ? ` (${range})` : ''}.`,
    caveatClear: 'Even allowing for chance, that is below 50%, so weigh this call with it in mind.',
    caveatMaybe: 'That range includes 50%, so the gap may be chance rather than a real weakness on this stock.',
    /** Factor sentences come from the API in English; only other languages rebuild them. */
    factor: (_feature: string, _value: number): string | null => null,
  },

  openCalls: {
    title: 'Calls in progress',
    intro: 'Earlier calls still inside their 5 trading days, updated after each close. Nothing here is a result yet: a call is only scored at the close of its last day.',
    calledAfter: (day: string, confidence: string) => `Called after ${day} close · ${confidence}`,
    dayOf: (done: number, total: number) => `Day ${done} of ${total}`,
    trackerAria: (done: number, total: number) => `${done} of ${total} trading days done`,
    notStarted: "The first session after the call hasn't closed yet.",
    ahead: (size: string) => `ahead of the index by ${size}`,
    behind: (size: string) => `behind the index by ${size}`,
    startsNext: 'Starts next session',
    onTrack: 'On track so far',
    offTrack: 'Off track so far',
    gapAria: (summary: string) => `Gap to the NIFTY 50 after each day: ${summary}`,
    gapDay: (i: number, value: string) => `day ${i}: ${value}`,
  },

  market: {
    indexSubtitle: (close: string) => `The index every call is measured against · ${close}`,
    moves: { d1: '1 day', d5: '5 days', d20: '1 month' },
    howToReadChart: 'How to read this chart',
    candleIntro: "Each candle is one trading day since 2016. The thin line runs from the day's lowest price to its highest; the box runs from where it opened to where it closed.",
    candleLink: 'How to read a candle →',
    recentTitle: 'Recent calls in testing',
    simulated: 'Simulated',
    recentSummary: (from: string, to: string, right: number, total: number, rate: string) => `${from} to ${to} · ${right} of ${total} right (${rate})`,
    recentIntro: "How the same method called the latest weeks in testing, before live calls began. These were never published, so they don't count towards the live record.",
    right: 'Right',
    wrong: 'Wrong',
    vsIndex: (v: string) => ` · ${v} vs index`,
    showingLatest: (shown: number, total: number) => `Showing the latest ${shown} of ${total}.`,
  },

  chart: {
    loadingAria: (name: string) => `Loading ${name}'s price history`,
    unavailable: "Price history isn't available right now.",
    layersAria: 'Chart layers',
    rangeAria: 'Chart range',
    candles: 'Candles',
    closeLine: 'Close line',
    average: (days: number) => `${days}-day average`,
    pastCalls: 'Past calls',
    chartAria: (name: string, from: string, to: string) => `${name} daily price chart from ${from} to ${to}. Scroll or pinch to zoom, drag to move through time.`,
    open: 'Open', high: 'High', low: 'Low', close: 'Close',
    vsDayBefore: 'vs day before',
    avgShort: (days: number) => `${days}-day avg`,
    latestDay: 'Latest day',
    reading: (low: string, high: string, open: string, close: string, up: boolean, change: number | null) => {
      const body = up
        ? `closed above where it opened (${open} → ${close}), so the candle is green`
        : `closed below where it opened (${open} → ${close}), so the candle is red`
      const range = `It traded between ${low} and ${high} during the day`
      if (change == null) return `${range}, and ${body}.`
      const vs = Math.abs(change) < 0.005 ? 'unchanged from' : `${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% from`
      return `${range}, and ${body}. That close was ${vs} the day before.`
    },
    key: {
      green: 'Green candle = closed above its open',
      red: 'Red candle = closed below its open',
      closeLine: 'Close line',
      average: '20-day average: the trend, smoothed',
      bullish: 'Bullish call',
      bearish: 'Bearish call',
      marks: '✓ right · ✗ wrong',
      dots: "Small dots are simulated calls from testing; larger ones are live calls, with no mark until they're scored.",
      howTo: 'Scroll or pinch to zoom, drag to move through time, and hover or tap a day to read it.',
    },
  },

  movers: {
    title: 'Market movers',
    subtitle: (close: string) => `The NIFTY 50's 50 stocks · ${close}`,
    viewAria: 'Movers view',
    periodAria: 'Period',
    sector: 'Sector',
    allSectors: 'All sectors',
    inSector: (label: string, sector: string) => `${label} in ${sector}`,
    empty: 'No stocks in this view.',
    noCalls: 'No calls',
    noCallsTitle: 'Parakh makes no calls on this stock',
    sparkAria: (symbol: string) => `${symbol} over the past month`,
    seeAll: 'See all in the screener →',
    nextTitle: 'What usually happens next?',
    nextGainers: (weeks: string, since: number, rate: string) =>
      `Across ${weeks} weeks since ${since}, the 5 biggest weekly gainers among Parakh's 20 stocks went on to lag the NIFTY 50 the next week ${rate} of the time.`,
    nextLosers: (weeks: string, since: number, rate: string) =>
      `Across ${weeks} weeks since ${since}, the 5 biggest weekly losers among Parakh's 20 stocks went on to beat the NIFTY 50 the next week ${rate} of the time.`,
    nextCaveat: 'A big move is not a reason on its own to buy, or to expect a bounce.',
    views: {
      gainers: { label: 'Gainers', note: 'Biggest rises over the period.' },
      losers: { label: 'Losers', note: 'Biggest falls over the period.' },
      active: { label: 'Most active', note: 'By value traded (shares × price) on the latest day. Share counts alone mislead: a cheaper stock trades more shares without being busier.' },
      unusual: { label: 'Unusual volume', note: "Shares traded on the latest day compared with the stock's own 20-day average. A big jump often means news." },
      high: { label: 'Near 52-week high', note: 'Where each price sits in its range over the past year.' },
      low: { label: 'Near 52-week low', note: 'Where each price sits in its range over the past year.' },
      rule: { label: 'Vs the others', note: "Parakh's 20 stocks ranked by their last 5 days against the average of the 20. This is the only input to Parakh's calls: the furthest behind lean bullish, the furthest ahead bearish, and only the clearest get a call." },
    },
    usual: (ratio: string) => `${ratio}× usual`,
    atHigh: 'At its high',
    belowHigh: (p: string) => `${p} below high`,
    atLow: 'At its low',
    aboveLow: (p: string) => `${p} above low`,
    crore: (n: string) => `₹${n} cr`,
  },

  glossary: {
    title: 'Glossary',
    intro: 'Every market word Parakh uses, in plain language. Tap a dotted word anywhere in the app to see its meaning.',
    search: 'Search terms',
    noMatch: 'No term matches that search.',
    example: 'Example',
    allTerms: 'All terms →',
    close: 'Close',
    terms: {
      nifty50: { term: 'NIFTY 50', short: 'The 50 biggest companies on the National Stock Exchange (NSE), combined into one number. When people say "the market is up today", they usually mean the NIFTY 50.', example: 'If the NIFTY 50 goes from 24,000 to 24,240, the market is up 1%.' },
      index: { term: 'Index', short: 'A single number that tracks how a group of stocks is doing, so you can see the whole group at a glance.', example: 'The NIFTY 50 tracks 50 large companies; the NIFTY Bank index tracks banks.' },
      indexFund: { term: 'Index fund', short: 'A fund that buys every stock in an index, so you get roughly the market\'s return for a small yearly fee. For most beginners it is the honest alternative to picking stocks.', example: '₹10,000 in a NIFTY 50 index fund is spread across all 50 companies.' },
      etf: { term: 'ETF', short: 'Exchange-traded fund: an index fund you buy and sell on the exchange like a share, at the live price.', example: 'NIFTYBEES is an ETF that tracks the NIFTY 50.' },
      sip: { term: 'SIP', short: 'Systematic investment plan: investing a fixed amount on a fixed date every month, whatever the price that day.', example: '₹5,000 into an index fund on the 5th of every month.' },
      beatIndex: { term: 'Beat the index', short: 'Do better than the NIFTY 50 over the same period. It is the question every Parakh call answers.', example: 'Stock +3%, NIFTY 50 +1%: the stock beat the index by 2%.' },
      excessReturn: { term: 'Return vs the index', short: 'A stock\'s return minus the index\'s return over the same days. Positive means it beat the index; negative means it lagged.', example: 'Stock −1%, NIFTY 50 −3%: the stock fell, but it was 2% ahead of the index.' },
      lean: { term: 'Lean', short: 'Parakh\'s view on whether a stock will beat or lag the NIFTY 50 over the next 5 trading days. It is not an instruction to buy or sell.', example: '"Bearish lean" means the data suggests it may lag the index.' },
      bullish: { term: 'Bullish', short: 'Expecting a price to do well. In Parakh, a bullish lean means the stock may beat the NIFTY 50.', example: 'A stock that fell much more than the others last week often gets a bullish lean.' },
      bearish: { term: 'Bearish', short: 'Expecting a price to do badly. In Parakh, a bearish lean means the stock may lag the NIFTY 50, so the data suggests waiting.', example: 'A stock that ran far ahead of the others last week often gets a bearish lean.' },
      noCall: { term: 'No call', short: 'Parakh says nothing about the stock today, because its signal isn\'t clear enough. Saying nothing beats guessing.', example: 'Most days, 15 or so of the 20 stocks get no call.' },
      edge: { term: 'Edge', short: 'How much better than chance something does. A real edge must be big enough to survive trading costs.', example: 'Right 51.4% of the time vs a coin flip\'s 50% is a slight edge, smaller than costs.' },
      hitRate: { term: 'Hit rate', short: 'The share of calls that turned out right.', example: '52 right out of 100 calls is a 52% hit rate.' },
      coinFlip: { term: 'Coin flip', short: 'Guessing at random: right half the time. Any method has to beat 50% to be worth anything.', example: 'If a tip group is right 50% of the time, it knows no more than a coin.' },
      testing: { term: 'Testing (backtest)', short: 'Running a method on past data, one day at a time, as if it were live, to see how it would have done. The results are simulated, not real.', example: 'Parakh\'s rule was tested on every trading day from 2019 to 2026.' },
      liveRecord: { term: 'Live record', short: 'Calls published before anyone knew the outcome, then scored. Unlike testing, nothing can be adjusted afterwards.', example: 'Each Parakh call is stored before the market opens and can never be edited.' },
      tradingDay: { term: 'Trading day', short: 'A day the stock exchange is open: Monday to Friday, except market holidays.', example: '5 trading days is usually one calendar week.' },
      candle: { term: 'Candlestick', short: 'One day of prices drawn as a shape. The box runs from the opening price to the closing price, and the thin line from the day\'s low to its high.', example: 'A green candle closed higher than it opened; a red one closed lower.' },
      movingAverage: { term: '20-day average', short: 'The average closing price of the last 20 trading days. It smooths out daily noise to show the trend.', example: 'A price above its 20-day average has been rising lately.' },
      volume: { term: 'Volume', short: 'How many shares changed hands in a day. A sudden jump often means news.', example: '3× the usual volume means three times as much trading as normal.' },
      costs: { term: 'Trading costs', short: 'What you pay each time you buy or sell: brokerage, securities transaction tax (STT), exchange fees, stamp duty and GST. Buying and selling once costs about 0.25%.', example: 'A trade that makes 0.1% before costs loses money after them.' },
      reversal: { term: 'Reversal', short: 'When last week\'s biggest winners fall back and last week\'s biggest losers catch up. Parakh\'s rule is built on this tendency.', example: 'A stock 8% ahead of the others last week leans bearish.' },
      week52: { term: '52-week high and low', short: 'The highest and lowest prices of the past year. They show where today\'s price sits in its recent range.', example: 'A stock at its 52-week high has never been more expensive this year.' },
      sector: { term: 'Sector', short: 'A group of companies in the same business, such as banks, IT or cement. Stocks in a sector often move together.', example: 'TCS and Infosys are both in the IT sector.' },
      drawdown: { term: 'Drawdown', short: 'How far an investment has fallen from its highest point. It measures how painful the bad times were.', example: 'From ₹1,20,000 down to ₹90,000 is a 25% drawdown.' },
      survivorship: { term: 'Survivorship bias', short: 'Looking only at the winners that survived, which makes the past look easier than it was. Today\'s NIFTY 50 is full of companies that did well.', example: 'Picking from today\'s 50 stocks in 2016 hides the ones that dropped out of the index.' },
    },
  },
}

export type Messages = typeof en
export type TermId = keyof Messages['glossary']['terms']
