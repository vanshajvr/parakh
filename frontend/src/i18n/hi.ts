import type { Messages } from './en'

/**
 * Hindi text (decision D-034): simple everyday Hindi that keeps the English market words people
 * actually use, such as stock, index, call and SIP.
 */

const pct = (x: number, digits = 1) => `${(Math.abs(x) * 100).toFixed(digits)}%`

/** Hindi versions of the factor sentences in ml/explain.py. */
function factor(feature: string, value: number): string | null {
  const up = value >= 0
  switch (feature) {
    case 'ret_1d': return `पिछले session में यह ${pct(value)} ${up ? 'चढ़ा' : 'गिरा'}`
    case 'ret_5d': return `पिछले एक हफ़्ते में यह ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} है`
    case 'ret_20d': return `पिछले एक महीने में यह ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} है`
    case 'rsi_14':
      if (value < 30) return `यह oversold दिख रहा है (RSI ${value.toFixed(0)})`
      if (value > 70) return `यह overbought दिख रहा है (RSI ${value.toFixed(0)})`
      return `इसकी momentum reading सामान्य है (RSI ${value.toFixed(0)})`
    case 'macd_hist': return `छोटी अवधि का momentum ${up ? 'ऊपर' : 'नीचे'} की ओर मुड़ रहा है`
    case 'dist_dma20': return `यह अपने 20-day average से ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} trade कर रहा है`
    case 'dist_dma50': return `यह अपने 50-day average से ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} trade कर रहा है`
    case 'dma20_vs_dma50': return `इसका छोटी अवधि का trend लंबी अवधि के trend से ${up ? 'ऊपर' : 'नीचे'} है`
    case 'vol_20d': {
      const size = value > 0.35 ? 'बड़े' : value < 0.2 ? 'छोटे' : 'मध्यम'
      return `हाल के उतार-चढ़ाव ${size} हैं (${(value * 100).toFixed(0)}% सालाना volatility)`
    }
    case 'atr_pct': return `इसका रोज़ का उतार-चढ़ाव करीब ${pct(value)} है`
    case 'bb_pctb':
      if (value > 0.8) return 'यह अपनी हाल की price range के ऊपरी हिस्से के पास है'
      if (value < 0.2) return 'यह अपनी हाल की price range के निचले हिस्से के पास है'
      return 'यह अपनी हाल की price range के बीच में है'
    case 'volume_z':
      if (value > 1.5) return 'trading volume आम दिनों से काफ़ी ज़्यादा है'
      if (value < -1.5) return 'trading volume आम दिनों से काफ़ी कम है'
      return 'trading volume सामान्य है'
    case 'mkt_ret_5d': return `पिछले एक हफ़्ते में NIFTY 50 ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} है`
    case 'mkt_ret_20d': return `पिछले एक महीने में NIFTY 50 ${pct(value)} ${up ? 'ऊपर' : 'नीचे'} है`
    case 'ret_5d_vs_peers': return `पिछले हफ़्ते इसने 20 stocks के औसत से ${pct(value)} ${up ? 'बेहतर' : 'कमज़ोर'} प्रदर्शन किया`
    case 'rel_strength_20d': return `पिछले एक महीने में यह NIFTY 50 से ${pct(value)} ${up ? 'आगे' : 'पीछे'} रहा`
  }
  return null
}

const CONFIDENCE: Record<string, string> = { 'Slight edge': 'हल्की बढ़त', 'Stronger edge': 'ज़्यादा बढ़त', 'No edge': 'कोई बढ़त नहीं' }

export const hi: Messages = {
  locale: 'hi-IN',

  layout: {
    skip: 'मुख्य हिस्से पर जाएँ',
    home: 'Parakh होम',
    nav: { today: 'आज', stocks: 'Stocks', record: 'Track record', recordShort: 'Record', learn: 'कैसे काम करता है', learnShort: 'सीखें' },
    install: 'App install करें',
    offline: 'आप offline हैं। Parakh ने इस device पर जो आख़िरी calls सेव की थीं, वही दिख रही हैं।',
    disclaimer: 'Parakh एक शैक्षिक project है। यह निवेश की सलाह नहीं है और SEBI में registered नहीं है।',
    language: 'भाषा',
    englishOnly: 'यह page अभी सिर्फ़ English में है। Hindi जल्द आएगा।',
    glossary: 'शब्दकोश',
  },

  states: {
    loading: (what) => `${what} लोड हो रही हैं…`,
    slow: 'Parakh free hosting पर चलता है, जो इस्तेमाल न होने पर सो जाती है। जागने में एक मिनट तक लग सकता है।',
    loadError: (what) => `${what} लोड नहीं हो सकीं। Connection या हमारे server में थोड़ी दिक्कत हो सकती है।`,
    tryAgain: 'फिर से कोशिश करें',
  },

  format: {
    closeLabel: (weekday, day) => `${weekday}, ${day} का बंद भाव`,
  },

  lean: { bullish: 'Bullish झुकाव', bearish: 'Bearish झुकाव', no_call: 'कोई call नहीं' },
  confidence: (label) => CONFIDENCE[label] ?? label,

  today: {
    loadingWhat: 'आज की calls',
    title: 'आज की calls',
    infoAria: 'इन calls का मतलब क्या है?',
    asOf: (close) => `${close} · अगले 5 trading days के लिए`,
    questionHeading: 'हर call इसी सवाल का जवाब देती है',
    question: 'क्या अगले 5 trading days में यह stock, NIFTY 50 index fund से बेहतर करेगा?',
    questionNote: 'झुकाव ख़रीदने या बेचने का निर्देश नहीं है। "कोई call नहीं" का मतलब है कि data इतना साफ़ नहीं कि कुछ कहा जा सके।',
    stale: (close) => `Data में देरी हो सकती है: ये calls ${close} की हैं।`,
    callsAria: 'आज की calls',
    filterAria: 'Calls छाँटें',
    filters: { calls: 'Calls', bullish: 'Bullish', bearish: 'Bearish' },
    keyNumbersAria: 'मुख्य आँकड़े',
    tiles: {
      liveRecord: 'Live record',
      day: (n) => `दिन ${n}`,
      starting: 'शुरुआत',
      publishedScored: (published, scored) => `${published} प्रकाशित · ${scored} का नतीजा आया`,
      rightSoFar: 'अब तक सही',
      acrossScored: (n) => `${n} live calls के नतीजों में`,
      firstResults: 'पहले नतीजे, पहली calls के 5 trading days बाद',
      inTesting: 'Testing में',
      inTestingDetail: '2019–2026 में सही calls · सिक्का उछालने पर 50%',
      todaysCalls: 'आज की calls',
      soon: 'जल्द',
      split: (bullish, bearish, none) => `${bullish} bullish · ${bearish} bearish · ${none} पर कोई call नहीं`,
      publishedAfterClose: 'हर दिन बाज़ार बंद होने के बाद, अगले दिन खुलने से पहले',
    },
    howToRead: {
      title: 'Call कैसे पढ़ें',
      rows: [
        ['झुकाव', 'Index से आगे या पीछे रहने की संभावना। ख़रीदने या बेचने का निर्देश नहीं।'],
        ['बढ़त', 'हर call में ज़्यादा से ज़्यादा हल्की बढ़त होती है। उसकी रसीद बताती है कि testing में calls कितनी बार सही रहीं।'],
        ['कारण', 'Call पर सबसे ज़्यादा असर किस बात का था, आसान शब्दों में।'],
        ['कोई call नहीं', 'अंदाज़ा लगाने से बेहतर है कुछ न कहना।'],
      ],
    },
    liveRecord: {
      label: 'Live record',
      summary: (published, scored) => ` · ${published} प्रकाशित · ${scored} का नतीजा आया`,
      body: 'हम अपना record सबके सामने बना रहे हैं। हर call बाज़ार खुलने से पहले प्रकाशित होती है और उसे कभी बदला नहीं जा सकता।',
      firstResults: ' पहले नतीजे, पहली calls के 5 trading days बाद आएँगे।',
      liveSoFar: 'Live अब तक:',
      rightOf: (rate) => `${rate} बार सही`,
      across: (n) => `, ${n} calls में।`,
      inTesting: 'Testing में:',
      coinFlip: ' (सिक्का उछालने पर: 50%)।',
      fullRecord: 'पूरा track record देखें →',
    },
    firstCalls: {
      title: 'हमारी पहली calls आने वाली हैं',
      body: 'Calls हर trading day बाज़ार बंद होने के बाद, अगले दिन खुलने से पहले प्रकाशित होती हैं। जब तक पहली calls नहीं आतीं, आप देख सकते हैं कि testing में यह तरीका कैसा रहा।',
      link: 'Track record देखें →',
    },
  },

  next: {
    in: (weekday, wait) => `अगली calls ${weekday} को बाज़ार बंद होने के बाद · ${wait} में`,
    due: 'अगली calls आने वाली हैं: आमतौर पर शाम 6:30 बजे (IST) तक आ जाती हैं',
    duration: (days, hours, minutes) =>
      days > 0 ? `${days} दिन ${hours} घंटे` : hours > 0 ? `${hours} घंटे ${minutes} मिनट` : `${minutes} मिनट`,
  },

  suggest: {
    title: 'आगे क्या देखें',
    strongestRule: (symbol, move, ahead, lean) =>
      `${symbol} पिछले हफ़्ते बाकियों से ${move} ${ahead ? 'आगे' : 'पीछे'} रहा। देखें कि इस पर ${lean} क्यों है`,
    strongest: (symbol) => `आज की सबसे साफ़ call ${symbol} पर है। वजह देखें`,
    closest: (symbol, share) => `${symbol} call बनने के सबसे करीब पहुँचा, पर call नहीं बनी (${Math.round(share * 100)}% रास्ता)`,
    open: (symbol, gap, day, total) => `${symbol} की call अब तक ${gap} है, ${total} में से दिन ${day}`,
    mover: (symbol, change, up) => `पिछले बंद भाव पर ${symbol} ${change} ${up ? 'चढ़ा' : 'गिरा'}, Parakh के 20 stocks में सबसे बड़ी चाल`,
    glossary: 'शब्द नए हैं? शब्दकोश हर शब्द को उदाहरण के साथ समझाता है',
  },

  noCall: {
    title: (n) => `${n} stocks पर कोई call नहीं`,
    generic: 'Signals मिले-जुले या कमज़ोर हैं, इसलिए अंदाज़ा लगाने से बेहतर है कुछ न कहना।',
    intro: 'Parakh का नियम सिर्फ़ उन stocks पर बोलता है जो पिछले हफ़्ते 20 stocks के औसत से सबसे ज़्यादा दूर गए। ये stocks औसत के इतने पास रहे कि call नहीं बनी।',
    move: (move) => (Math.abs(move) < 0.0005 ? 'औसत के बराबर' : `औसत से ${pct(move)} ${move > 0 ? 'आगे' : 'पीछे'}`),
    callsFrom: (from) => `calls ${pct(from)} से शुरू हुईं`,
    noneThisSide: 'आज इस तरफ़ कोई call नहीं',
    closeness: (symbol, share) => `${symbol} call बनने के ${Math.round(share * 100)}% रास्ते पर है`,
  },

  call: {
    headline: {
      bullish: 'NIFTY 50 से बेहतर करने की ओर झुकाव।',
      bearish: 'NIFTY 50 से पीछे रहने की ओर झुकाव। Data रुकने का इशारा करता है।',
      no_call: 'आज कोई साफ़ बढ़त नहीं: signals मिले-जुले या कमज़ोर हैं।',
    },
    chanceLags: (p) => `index से पीछे रहने की ${p} संभावना`,
    chanceBeats: (p) => `index से आगे निकलने की ${p} संभावना`,
    rightInTesting: (rate) => `testing में ${rate} सही`,
    belowCoinFlip: (symbol, rate) => `${symbol} पर: testing में ${rate}, सिक्का उछालने से भी कम`,
    biggestFactors: 'सबसे बड़े कारण',
    noStandout: 'कोई एक ख़ास कारण नहीं।',
    reversalLink: 'यह उल्टी दिशा में क्यों दिख सकता है? Reversal के बारे में →',
    open: (symbol) => `${symbol} खोलें →`,
    range: (low, high) => `शायद ${low}–${high}%`,
    receiptAll: (rate, n) => `Testing की ${n} calls में से ${rate} सही रहीं।`,
    receiptStock: (name, rate, n, range) => `ख़ास तौर पर ${name} पर: ${n} calls में ${rate}${range ? ` (${range})` : ''}।`,
    caveatClear: 'संयोग को ध्यान में रखने के बाद भी यह 50% से कम है, इसलिए इस call को इसी बात के साथ तौलें।',
    caveatMaybe: 'इस range में 50% भी आता है, इसलिए यह फ़र्क संयोग हो सकता है, इस stock की असली कमज़ोरी नहीं।',
    factor,
  },

  openCalls: {
    title: 'चल रही calls',
    intro: 'पहले की calls जो अभी अपने 5 trading days के अंदर हैं, हर दिन बाज़ार बंद होने के बाद अपडेट होती हैं। यहाँ अभी कोई नतीजा नहीं है: call का नतीजा उसके आख़िरी दिन के बंद भाव पर ही तय होता है।',
    calledAfter: (day, confidence) => `${day} के बंद भाव के बाद की call · ${confidence}`,
    dayOf: (done, total) => `${total} में से दिन ${done}`,
    trackerAria: (done, total) => `${total} में से ${done} trading days पूरे`,
    notStarted: 'Call के बाद का पहला session अभी बंद नहीं हुआ है।',
    ahead: (size) => `index से ${size} आगे`,
    behind: (size) => `index से ${size} पीछे`,
    startsNext: 'अगले session से शुरू',
    onTrack: 'अब तक सही दिशा में',
    offTrack: 'अब तक उल्टी दिशा में',
    gapAria: (summary) => `हर दिन के बाद NIFTY 50 से फ़र्क: ${summary}`,
    gapDay: (i, value) => `दिन ${i}: ${value}`,
  },

  market: {
    indexSubtitle: (close) => `वह index जिससे हर call की तुलना होती है · ${close}`,
    moves: { d1: '1 दिन', d5: '5 दिन', d20: '1 महीना' },
    howToReadChart: 'यह chart कैसे पढ़ें',
    candleIntro: 'हर candle 2016 से अब तक का एक trading day है। पतली रेखा दिन के सबसे कम भाव से सबसे ऊँचे भाव तक जाती है; box खुलने के भाव से बंद होने के भाव तक।',
    candleLink: 'Candle कैसे पढ़ें →',
    recentTitle: 'Testing की हाल की calls',
    simulated: 'Simulated',
    recentSummary: (from, to, right, total, rate) => `${from} से ${to} · ${total} में से ${right} सही (${rate})`,
    recentIntro: 'Live calls शुरू होने से पहले, इसी तरीके ने testing में हाल के हफ़्तों पर क्या call की। ये कभी प्रकाशित नहीं हुईं, इसलिए live record में नहीं गिनी जातीं।',
    right: 'सही',
    wrong: 'ग़लत',
    vsIndex: (v) => ` · index के मुकाबले ${v}`,
    showingLatest: (shown, total) => `${total} में से हाल की ${shown} दिख रही हैं।`,
  },

  chart: {
    loadingAria: (name) => `${name} का price history लोड हो रहा है`,
    unavailable: 'Price history अभी उपलब्ध नहीं है।',
    layersAria: 'Chart की परतें',
    rangeAria: 'Chart की अवधि',
    candles: 'Candles',
    closeLine: 'Close line',
    average: (days) => `${days}-day average`,
    pastCalls: 'पिछली calls',
    chartAria: (name, from, to) => `${name} का रोज़ का price chart, ${from} से ${to} तक। Zoom के लिए scroll या pinch करें, समय में आगे-पीछे जाने के लिए drag करें।`,
    open: 'खुला', high: 'ऊँचा', low: 'नीचा', close: 'बंद',
    vsDayBefore: 'पिछले दिन से',
    avgShort: (days) => `${days}-day avg`,
    latestDay: 'आख़िरी दिन',
    reading: (low, high, open, close, up, change) => {
      const body = up
        ? `यह खुलने के भाव से ऊपर बंद हुआ (${open} → ${close}), इसलिए candle हरी है`
        : `यह खुलने के भाव से नीचे बंद हुआ (${open} → ${close}), इसलिए candle लाल है`
      const range = `दिन में यह ${low} से ${high} के बीच trade हुआ`
      if (change == null) return `${range}, और ${body}।`
      const vs = Math.abs(change) < 0.005 ? 'पिछले दिन जितना ही रहा' : `पिछले दिन से ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'ऊपर' : 'नीचे'} रहा`
      return `${range}, और ${body}। वह बंद भाव ${vs}।`
    },
    key: {
      green: 'हरी candle = खुलने से ऊपर बंद हुआ',
      red: 'लाल candle = खुलने से नीचे बंद हुआ',
      closeLine: 'Close line',
      average: '20-day average: trend, उतार-चढ़ाव हटाकर',
      bullish: 'Bullish call',
      bearish: 'Bearish call',
      marks: '✓ सही · ✗ ग़लत',
      dots: 'छोटे बिंदु testing की simulated calls हैं; बड़े बिंदु live calls हैं, जिन पर नतीजा आने तक कोई निशान नहीं होता।',
      howTo: 'Zoom के लिए scroll या pinch करें, समय में आगे-पीछे जाने के लिए drag करें, और किसी दिन को पढ़ने के लिए उस पर hover या tap करें।',
    },
  },

  movers: {
    title: 'बाज़ार के movers',
    subtitle: (close) => `NIFTY 50 के 50 stocks · ${close}`,
    viewAria: 'Movers का view',
    periodAria: 'अवधि',
    sector: 'Sector',
    allSectors: 'सभी sectors',
    inSector: (label, sector) => `${sector} में ${label}`,
    empty: 'इस view में कोई stock नहीं।',
    noCalls: 'Call नहीं',
    noCallsTitle: 'Parakh इस stock पर calls नहीं करता',
    sparkAria: (symbol) => `पिछले एक महीने में ${symbol}`,
    seeAll: 'Screener में सभी देखें →',
    nextTitle: 'आगे आमतौर पर क्या होता है?',
    nextGainers: (weeks, since, rate) =>
      `${since} से अब तक के ${weeks} हफ़्तों में, Parakh के 20 stocks में से हफ़्ते के 5 सबसे बड़े gainers अगले हफ़्ते ${rate} बार NIFTY 50 से पीछे रहे।`,
    nextLosers: (weeks, since, rate) =>
      `${since} से अब तक के ${weeks} हफ़्तों में, Parakh के 20 stocks में से हफ़्ते के 5 सबसे बड़े losers अगले हफ़्ते ${rate} बार NIFTY 50 से आगे निकले।`,
    nextCaveat: 'सिर्फ़ बड़ा उछाल या गिरावट, ख़रीदने या वापसी की उम्मीद करने का कारण नहीं है।',
    views: {
      gainers: { label: 'Gainers', note: 'इस अवधि में सबसे ज़्यादा चढ़े।' },
      losers: { label: 'Losers', note: 'इस अवधि में सबसे ज़्यादा गिरे।' },
      active: { label: 'सबसे ज़्यादा कारोबार', note: 'आख़िरी दिन के कारोबार की कीमत (shares × भाव) के हिसाब से। सिर्फ़ shares की गिनती भ्रम पैदा करती है: सस्ते stock के ज़्यादा shares बिकते हैं, पर इसका मतलब ज़्यादा कारोबार नहीं।' },
      unusual: { label: 'असामान्य volume', note: 'आख़िरी दिन कितने shares बिके, stock के अपने 20-day average के मुकाबले। बड़ी उछाल का मतलब अक्सर कोई ख़बर होता है।' },
      high: { label: '52-week high के पास', note: 'पिछले एक साल की range में हर भाव कहाँ है।' },
      low: { label: '52-week low के पास', note: 'पिछले एक साल की range में हर भाव कहाँ है।' },
      rule: { label: 'बाकियों के मुकाबले', note: 'Parakh के 20 stocks, पिछले 5 दिनों में 20 के औसत के मुकाबले क्रम में। Parakh की calls का यही एकमात्र आधार है: सबसे पीछे वाले bullish, सबसे आगे वाले bearish, और call सिर्फ़ सबसे साफ़ मामलों पर।' },
    },
    usual: (ratio) => `आम से ${ratio}×`,
    atHigh: 'अपने high पर',
    belowHigh: (p) => `high से ${p} नीचे`,
    atLow: 'अपने low पर',
    aboveLow: (p) => `low से ${p} ऊपर`,
    crore: (n) => `₹${n} करोड़`,
  },

  glossary: {
    title: 'शब्दकोश',
    intro: 'Parakh में इस्तेमाल होने वाला हर बाज़ार का शब्द, आसान भाषा में। App में कहीं भी बिंदुओं वाली लाइन के नीचे लिखे शब्द पर tap करके उसका मतलब देखें।',
    search: 'शब्द खोजें',
    noMatch: 'इस खोज से कोई शब्द नहीं मिला।',
    example: 'उदाहरण',
    allTerms: 'सभी शब्द →',
    close: 'बंद करें',
    terms: {
      nifty50: { term: 'NIFTY 50', short: 'National Stock Exchange (NSE) की 50 सबसे बड़ी कंपनियाँ, मिलाकर एक संख्या में। जब लोग कहते हैं "आज बाज़ार ऊपर है", तो उनका मतलब आमतौर पर NIFTY 50 होता है।', example: 'NIFTY 50 अगर 24,000 से 24,240 पर जाए, तो बाज़ार 1% ऊपर है।' },
      index: { term: 'Index', short: 'एक संख्या जो बताती है कि stocks का एक समूह कैसा कर रहा है, ताकि पूरा समूह एक नज़र में दिख जाए।', example: 'NIFTY 50 पचास बड़ी कंपनियों को track करता है; NIFTY Bank index बैंकों को।' },
      indexFund: { term: 'Index fund', short: 'ऐसा fund जो index के हर stock को ख़रीदता है, ताकि थोड़ी सालाना fee पर आपको लगभग बाज़ार जितना return मिले। ज़्यादातर नए निवेशकों के लिए stocks चुनने का ईमानदार विकल्प यही है।', example: 'NIFTY 50 index fund में ₹10,000 सभी 50 कंपनियों में बँट जाते हैं।' },
      etf: { term: 'ETF', short: 'Exchange-traded fund: ऐसा index fund जिसे आप exchange पर share की तरह, live भाव पर ख़रीद-बेच सकते हैं।', example: 'NIFTYBEES एक ETF है जो NIFTY 50 को track करता है।' },
      sip: { term: 'SIP', short: 'Systematic investment plan: हर महीने एक तय तारीख़ को एक तय रकम निवेश करना, उस दिन भाव कुछ भी हो।', example: 'हर महीने की 5 तारीख़ को ₹5,000 एक index fund में।' },
      beatIndex: { term: 'Index से आगे निकलना', short: 'उसी अवधि में NIFTY 50 से बेहतर करना। Parakh की हर call इसी सवाल का जवाब देती है।', example: 'Stock +3%, NIFTY 50 +1%: stock index से 2% आगे निकला।' },
      excessReturn: { term: 'Index के मुकाबले return', short: 'उन्हीं दिनों में stock का return, index के return को घटाकर। Positive मतलब index से आगे; negative मतलब पीछे।', example: 'Stock −1%, NIFTY 50 −3%: stock गिरा, फिर भी index से 2% आगे रहा।' },
      lean: { term: 'झुकाव (Lean)', short: 'Parakh की राय कि अगले 5 trading days में कोई stock NIFTY 50 से आगे रहेगा या पीछे। यह ख़रीदने या बेचने का निर्देश नहीं है।', example: '"Bearish झुकाव" का मतलब है कि data के हिसाब से यह index से पीछे रह सकता है।' },
      bullish: { term: 'Bullish', short: 'भाव के अच्छा करने की उम्मीद। Parakh में bullish झुकाव का मतलब है कि stock NIFTY 50 से आगे निकल सकता है।', example: 'जो stock पिछले हफ़्ते बाकियों से बहुत ज़्यादा गिरा, उस पर अक्सर bullish झुकाव आता है।' },
      bearish: { term: 'Bearish', short: 'भाव के कमज़ोर रहने की उम्मीद। Parakh में bearish झुकाव का मतलब है कि stock NIFTY 50 से पीछे रह सकता है, इसलिए data रुकने का इशारा करता है।', example: 'जो stock पिछले हफ़्ते बाकियों से बहुत आगे निकल गया, उस पर अक्सर bearish झुकाव आता है।' },
      noCall: { term: 'कोई call नहीं', short: 'Parakh आज इस stock पर कुछ नहीं कहता, क्योंकि इसका signal साफ़ नहीं है। अंदाज़ा लगाने से बेहतर है कुछ न कहना।', example: 'ज़्यादातर दिनों में 20 में से करीब 15 stocks पर कोई call नहीं होती।' },
      edge: { term: 'बढ़त (Edge)', short: 'कोई चीज़ संयोग से कितना बेहतर करती है। असली बढ़त इतनी बड़ी होनी चाहिए कि trading के ख़र्चों के बाद भी बची रहे।', example: '51.4% बार सही होना, सिक्के के 50% के मुकाबले हल्की बढ़त है, जो ख़र्चों से भी छोटी है।' },
      hitRate: { term: 'Hit rate', short: 'कितने प्रतिशत calls सही निकलीं।', example: '100 में से 52 calls सही, यानी 52% hit rate।' },
      coinFlip: { term: 'सिक्का उछालना', short: 'बिना सोचे अंदाज़ा: आधी बार सही। किसी भी तरीके को काम का होने के लिए 50% से बेहतर करना होगा।', example: 'अगर कोई tip group 50% बार सही है, तो वह सिक्के से ज़्यादा कुछ नहीं जानता।' },
      testing: { term: 'Testing (backtest)', short: 'किसी तरीके को पुराने data पर, एक-एक दिन करके, ऐसे चलाना मानो वह live हो, ताकि पता चले वह कैसा रहता। ये नतीजे simulated हैं, असली नहीं।', example: 'Parakh का नियम 2019 से 2026 तक हर trading day पर test किया गया।' },
      liveRecord: { term: 'Live record', short: 'नतीजा पता चलने से पहले प्रकाशित calls, जिनका बाद में नतीजा तय हुआ। Testing के उलट, इनमें बाद में कुछ बदला नहीं जा सकता।', example: 'Parakh की हर call बाज़ार खुलने से पहले सेव होती है और कभी बदली नहीं जा सकती।' },
      tradingDay: { term: 'Trading day', short: 'वह दिन जब stock exchange खुला रहता है: सोमवार से शुक्रवार, बाज़ार की छुट्टियों को छोड़कर।', example: '5 trading days आमतौर पर एक हफ़्ता होते हैं।' },
      candle: { term: 'Candlestick', short: 'एक दिन के भाव एक आकार में। Box खुलने के भाव से बंद होने के भाव तक जाता है, और पतली रेखा दिन के सबसे कम से सबसे ऊँचे भाव तक।', example: 'हरी candle खुलने से ऊपर बंद हुई; लाल candle नीचे।' },
      movingAverage: { term: '20-day average', short: 'पिछले 20 trading days के बंद भावों का औसत। यह रोज़ के शोर को हटाकर trend दिखाता है।', example: 'जो भाव अपने 20-day average से ऊपर है, वह हाल में चढ़ रहा है।' },
      volume: { term: 'Volume', short: 'एक दिन में कितने shares ख़रीदे-बेचे गए। अचानक उछाल का मतलब अक्सर कोई ख़बर होता है।', example: 'आम से 3× volume मतलब सामान्य से तीन गुना कारोबार।' },
      costs: { term: 'Trading के ख़र्चे', short: 'हर बार ख़रीदने या बेचने पर लगने वाला पैसा: brokerage, securities transaction tax (STT), exchange fees, stamp duty और GST। एक बार ख़रीदकर बेचने में करीब 0.25% लगता है।', example: 'जो trade ख़र्चों से पहले 0.1% कमाता है, वह ख़र्चों के बाद नुकसान में है।' },
      reversal: { term: 'Reversal', short: 'जब पिछले हफ़्ते के सबसे बड़े gainers वापस गिरते हैं और सबसे बड़े losers पकड़ बना लेते हैं। Parakh का नियम इसी रुझान पर बना है।', example: 'जो stock पिछले हफ़्ते बाकियों से 8% आगे था, उस पर bearish झुकाव है।' },
      week52: { term: '52-week high और low', short: 'पिछले एक साल का सबसे ऊँचा और सबसे कम भाव। ये बताते हैं कि आज का भाव हाल की range में कहाँ है।', example: '52-week high पर stock इस साल कभी इतना महँगा नहीं रहा।' },
      sector: { term: 'Sector', short: 'एक ही तरह के कारोबार वाली कंपनियों का समूह, जैसे बैंक, IT या सीमेंट। एक sector के stocks अक्सर साथ चलते हैं।', example: 'TCS और Infosys दोनों IT sector में हैं।' },
      drawdown: { term: 'Drawdown', short: 'कोई निवेश अपने सबसे ऊँचे स्तर से कितना गिरा। यह बताता है कि बुरा समय कितना तकलीफ़देह था।', example: '₹1,20,000 से ₹90,000 तक गिरना 25% drawdown है।' },
      survivorship: { term: 'Survivorship bias', short: 'सिर्फ़ उन विजेताओं को देखना जो टिके रहे, जिससे पुराना समय असल से आसान लगता है। आज का NIFTY 50 उन कंपनियों से भरा है जिन्होंने अच्छा किया।', example: '2016 में आज के 50 stocks में से चुनना, उन कंपनियों को छिपा देता है जो index से बाहर हो गईं।' },
    },
  },
}
