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

// "Stronger edge" was dropped (D-032); older calls that stored it read as the one remaining label.
const CONFIDENCE: Record<string, string> = { 'Slight edge': 'हल्की बढ़त', 'Stronger edge': 'हल्की बढ़त', 'No edge': 'कोई बढ़त नहीं' }

export const hi: Messages = {
  locale: 'hi-IN',

  layout: {
    skip: 'मुख्य हिस्से पर जाएँ',
    home: 'Parakh होम',
    nav: { today: 'आज', stocks: 'Stocks', practice: 'अभ्यास', record: 'Track record', recordShort: 'Record', learn: 'कैसे काम करता है', learnShort: 'सीखें' },
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
      body: 'हम अपना record सबके सामने बना रहे हैं। हर call बाज़ार खुलने से पहले प्रकाशित होती है, और database उसमें बदलाव रोकता है।',
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

  news: {
    title: 'ख़बरों में',
    subtitle: 'ये क्यों हिले? सबसे बड़े movers की पिछले 3 दिनों की ख़बरें।',
    stockTitle: 'हाल की ख़बरें',
    stockSubtitle: 'पिछले 3 दिनों की ख़बरें। हर ख़बर प्रकाशक की site पर खुलती है।',
    caveat: 'जब तक ख़बर आप तक पहुँचती है, भाव आमतौर पर पहले ही बदल चुका होता है।',
    empty: 'पिछले 3 दिनों में इस stock पर कोई ख़बर नहीं।',
    more: (n) => `+${n} और`,
    opensIn: (source) => `${source}, नए tab में खुलेगा`,
    note: 'ख़बरें Google News से आती हैं। Tips और भाव के अनुमान शामिल नहीं किए जाते।',
  },

  practice: {
    title: 'टाइम मशीन',
    intro: 'नकली पैसे के साथ बाज़ार के किसी असली दौर में वापस जाएँ। NIFTY 50 के असली stocks या index fund ख़रीदें-बेचें, समय को आगे बढ़ने दें, और देखें कि क्या आप सिर्फ़ index fund रखने से बेहतर कर पाए।',
    pickPeriod: 'एक दौर चुनें',
    adjusted: 'भाव बाद के splits, bonus और dividends के हिसाब से adjust किए गए हैं, इसलिए कोई share उस समय की screen से सस्ता दिख सकता है। रुपयों में फ़ायदा-नुकसान, dividends समेत, लगभग उतना ही रहता है; बस पूरे shares और बचे नकद का थोड़ा फ़र्क आता है।',
    adjustedTag: 'Adjusted भाव',
    survivors: 'यहाँ के stocks आज के NIFTY 50 हैं, इसलिए जो कंपनियाँ तब से index से बाहर हो गईं, वे इसमें नहीं हैं। इससे stocks चुनना असल से आसान दिखता है।',
    startingMoney: 'शुरुआती पैसा',
    monthlyAmount: 'हर महीने की SIP',
    custom: 'दूसरी रकम',
    start: 'शुरू करें',
    resume: (title) => `जारी रखें: ${title}`,
    how: {
      title: 'कैसे काम करता है',
      pick: 'Index fund या कोई भी stock ख़रीदें',
      play: 'चलाएँ दबाएँ और समय को आगे बढ़ते देखें',
      beat: 'क्या आप index fund से आगे रहे?',
    },
    tour: {
      next: 'आगे',
      back: 'पीछे',
      skip: 'छोड़ें',
      done: 'चलिए खेलें',
      step: (i, n) => `${n} में से कदम ${i}`,
      money: { title: 'यह आपका पैसा है', body: 'बिंदुओं वाली लाइन वही पैसा है जो index fund में छोड़ा गया। उससे ऊपर रहने की कोशिश करें।' },
      market: { title: 'यहाँ से ख़रीदें', body: 'Index fund से शुरू करें, या stocks चुनें। ख़रीदें दबाएँ, रुपये या shares चुनें।' },
      play: { title: 'फिर चलाएँ दबाएँ', body: 'समय आगे बढ़ता है। आपके orders अगली सुबह पूरे होते हैं।' },
      prompt: { title: 'Game आपको रोकेगा', body: 'जब बाज़ार गिरता या उछलता है, तो वह पूछता है कि आप क्या करेंगे।' },
      report: { title: 'देखें आपने कैसा किया', body: 'आख़िर में report card आपकी तुलना index fund से करता है।' },
    },
    newGame: 'नया game',
    confirmNew: 'नया game शुरू करें? यह वाला मिट जाएगा।',
    scenarios: {
      crash: { title: 'गिरावट से बचिए', period: 'जनवरी – दिसंबर 2020', blurb: 'मार्च में Covid आया और कुछ ही हफ़्तों में बाज़ार एक-तिहाई गिर गया। आप क्या करते?' },
      bull: { title: 'तेज़ी का दौर', period: '2021', blurb: 'लगभग सब कुछ ऊपर गया। क्या stocks चुनना index fund से बेहतर रहा?' },
      flat: { title: 'कहीं नहीं पहुँचे', period: 'अक्टूबर 2021 – मार्च 2023', blurb: '18 महीने का उतार-चढ़ाव, जो वहीं ख़त्म हुआ जहाँ शुरू हुआ था। क्या trading से फ़ायदा हुआ?' },
      sip: { title: 'दस साल की SIP', period: '2016 – आज', blurb: 'हर महीने एक ही रकम index fund में, हर गिरावट और हर तेज़ी के बीच।' },
      mystery: { title: 'रहस्यमय दौर', period: 'तारीख़ें छिपी हैं', blurb: 'पिछले दस साल में से कोई भी 1–2 साल। पीछे की जानकारी का कोई सहारा नहीं।' },
    },
    dayOf: (day, total) => `${total} में से दिन ${day}`,
    play: 'चलाएँ',
    pause: 'रोकें',
    speed: 'रफ़्तार',
    week: '+1 हफ़्ता',
    month: '+1 महीना',
    progress: 'दौर कितना पूरा हुआ',
    yourMoney: 'आपका पैसा',
    fund: 'सिर्फ़ index fund',
    cash: 'नकद',
    putIn: (x) => `${x} लगाए`,
    ahead: (x) => `index fund से ${x} आगे`,
    behind: (x) => `index fund से ${x} पीछे`,
    level: 'Index fund के बराबर',
    legendYou: 'आप',
    legendFund: 'Index fund, बिना छेड़े',
    chartAria: (you, fund) => `आपका पैसा (${you}) और वही पैसा index fund में (${fund}), दिन-ब-दिन`,
    holdings: 'आपकी holdings',
    noHoldings: 'अभी कुछ नहीं ख़रीदा: सब नकद है। ख़रीदने के लिए बाज़ार से कुछ चुनें।',
    shares: (n) => `${n} shares`,
    gainLoss: (x) => `ख़रीदने के बाद से ${x}`,
    sellHalf: 'आधा बेचें',
    sellAll: 'सब बेचें',
    pending: 'अगले दिन बाज़ार खुलने पर होगा',
    pendingBuy: (symbol, amount) => `${symbol} ख़रीदें, ${amount} तक`,
    pendingSell: (symbol, qty) => `${qty} ${symbol} बेचें`,
    pendingBuyShares: (symbol, qty) => `${qty} ${symbol} ख़रीदें`,
    sell: 'बेचें',
    startHere: 'यहाँ से शुरू करें',
    playStep: { title: 'अब चलाएँ दबाएँ', body: 'समय आगे बढ़ते ही आपका order अगली सुबह बाज़ार खुलने पर पूरा होगा।' },
    runningTip: { title: 'कभी भी रोकें', body: 'जब चाहें ख़रीदें या बेचें। बाज़ार में बड़ी हलचल पर game ख़ुद रुकेगा।' },
    firstStep: { title: 'पहले कुछ ख़रीदें', body: 'अभी सब नकद है। कुछ ख़रीदें, फिर चलाएँ दबाएँ।', button: 'Index fund ख़रीदें', other: 'या बाज़ार से कोई stock चुनें' },
    pressPlay: 'अब चलाएँ दबाएँ',
    howToPlay: 'कैसे खेलें',
    cancel: 'रद्द करें',
    rejected: {
      'no-price': (symbol) => `उस सुबह ${symbol} का कोई भाव नहीं था, इसलिए order पूरा नहीं हुआ।`,
      'too-small': (symbol) => `${symbol} का एक share ख़रीदने जितना भी नकद नहीं था।`,
      'nothing-to-sell': (symbol) => `बेचने के लिए कोई ${symbol} नहीं बचा था।`,
      'game-over': (symbol) => `${symbol} का order पूरा होने से पहले दौर ख़त्म हो गया।`,
    },
    market: 'बाज़ार',
    search: 'Stocks खोजें',
    indexFundTag: 'Index fund',
    notListed: 'अभी listed नहीं',
    buy: 'ख़रीदें',
    oneMonth: '1 महीना',
    held: (n) => `आपके पास ${n}`,
    order: {
      buyTitle: (symbol) => `${symbol} ख़रीदें`,
      amount: 'कितना लगाना है',
      allCash: 'सारा नकद',
      estimate: (qty, price, total) => `करीब ${qty} shares, ${price} के भाव पर, करीब ${total}`,
      sellTitle: (symbol) => `${symbol} बेचें`,
      buyBy: 'किस हिसाब से ख़रीदें',
      byAmount: 'रुपये',
      byShares: 'Shares',
      sharesToBuy: 'कितने shares ख़रीदने हैं',
      sharesToSell: 'कितने shares बेचने हैं',
      maxShares: (n) => `आपके नकद से ज़्यादा से ज़्यादा ${n} आएँगे`,
      half: 'आधे',
      all: 'सारे',
      heldNow: (n) => `आपके पास ${n}`,
      nothing: 'चुनें कि कितने shares बेचने हैं।',
      sellCharges: 'इस बिक्री पर ख़र्चे',
      confirmSell: 'बेचने का order दें',
      tooSmall: 'इस भाव पर एक share के लिए भी पैसा कम है।',
      fills: 'Order अगले दिन बाज़ार खुलने पर पूरा होता है, इसलिए भाव पहले थोड़ा बदल सकता है। भाव बाद के splits, bonus और dividends के हिसाब से adjust किए गए हैं।',
      charges: 'इस ख़रीद पर ख़र्चे',
      lines: { stt: 'Securities transaction tax', exchange: 'Exchange fee', sebi: 'SEBI fee', stamp: 'Stamp duty', gst: 'Fees पर GST', dp: 'Depository charge' },
      total: 'कुल ख़र्चे',
      confirm: 'Order दें',
      close: 'बंद करें',
      cashLeft: (x) => `उपलब्ध नकद: ${x}`,
    },
    prompt: {
      fall: (change) => `NIFTY 50 अभी दो हफ़्तों में ${change} गिरा है।`,
      rise: (change) => `NIFTY 50 एक महीने में ${change} ऊपर है।`,
      drawdown: (change) => `आपका पैसा अपने अब तक के सबसे ऊँचे स्तर से ${change} नीचे है।`,
      fallMood: 'ख़बरें डरावनी हैं और लोग बेच रहे हैं। अभी कोई नहीं जानता कि यह कैसे ख़त्म होगा।',
      riseMood: 'लगता है सब पैसा बना रहे हैं, और आप पीछे छूट रहे हैं।',
      drawdownMood: 'अपना पैसा घटते देखना, उसके बारे में पढ़ने से कहीं मुश्किल है।',
      ask: 'आप क्या करेंगे?',
      hold: 'टिके रहें',
      holdNote: 'कुछ न बदलें।',
      sellFall: 'सब बेच दें',
      sellFallNote: 'अगले दिन बाज़ार खुलते ही सब नकद में।',
      sellRise: 'मुनाफ़ा निकालें',
      sellRiseNote: 'अगले दिन बाज़ार खुलते ही हर चीज़ का आधा बेचें।',
      buy: 'और ख़रीदें',
      buyNote: 'अगले दिन बाज़ार खुलते ही अपना नकद index fund में लगाएँ।',
      hidden: 'आपको सिर्फ़ वही दिख रहा है जो उस दिन पता होता।',
    },
    end: {
      title: 'समय पूरा हुआ',
      you: 'आप',
      fund: 'Index fund, बिना छेड़े',
      beat: (x) => `आपने index fund को ${x} से पीछे छोड़ा।`,
      lost: (x) => `Index fund ने आपको ${x} से पीछे छोड़ा।`,
      tie: 'आप index fund के बराबर रहे।',
      details: (trades, charges) => `${trades} trades · ${charges} ख़र्चों में`,
      revealed: (from, to) => `रहस्यमय दौर ${from} से ${to} तक था।`,
      again: 'यही फिर से खेलें',
      soon: '',
    },
  },

  report: {
    title: 'आपका report card',
    returns: 'Return',
    worstFall: 'सबसे बड़ी गिरावट',
    trades: 'Trades',
    charges: 'ख़र्चे',
    you: 'आप',
    fund: 'Index fund',
    notesTitle: 'आपके फ़ैसले क्या बताते हैं',
    lessonsTitle: 'इस game से सबक',
    readLesson: 'सबक पढ़ें',
    tryMystery: 'रहस्यमय दौर आज़माएँ',
    choice: { hold: 'टिके रहे', sell: 'बेच दिया', buy: 'और ख़रीदा' },
    kind: { fall: 'बाज़ार गिरा', rise: 'बाज़ार उछला', drawdown: 'आपका पैसा नीचे था' },
    decision: (when, kind, change, choice, after) =>
      `${when} को ${kind} (${change}) और आपने ${choice}।` + (after ? ` अगले एक महीने में index fund ${after}।` : ''),
    fallSale: (when, symbol, fall, after) =>
      `${when} को आपने ${symbol} बेचा, जब बाज़ार अपने हाल के ऊँचे स्तर से ${fall} नीचे था।` + (after ? ` अगले एक महीने में index fund ${after}।` : ''),
    costs: (charges, trades, share) => `${trades} trades पर ${charges} ख़र्चे लगे` + (share ? `, यानी आपके मुनाफ़े का ${share}।` : '।'),
    cash: (share) => `औसतन आपका ${share} पैसा नकद में पड़ा रहा, बिना कुछ कमाए।`,
    concentration: (symbol, share) => `आख़िर में आपका ${share} पैसा एक ही stock, ${symbol}, में था।`,
    stockPicking: 'आपने आज के NIFTY 50 से अलग-अलग stocks चुने: एक ऐसी सूची जो पहले से जानती है कि कौन टिका रहा।',
    sip: (n) => `${n} मासिक किस्तें लगीं, ऊँचे भाव पर भी और नीचे भाव पर भी।`,
    beat: (gap) => `आपने index fund को ${gap} से पीछे छोड़ा। एक दौर से हुनर और किस्मत का फ़र्क नहीं पता चलता।`,
    behind: (gap) => `Index fund ने आपको ${gap} से पीछे छोड़ा, और उसमें किसी ने एक भी फ़ैसला नहीं लिया।`,
    level: 'आप index fund के बराबर रहे।',
    up: (x) => `${x} ऊपर गया`,
    down: (x) => `${x} नीचे गया`,
  },

  lessons: {
    panic: { title: 'गिरावट में बेचना', body: 'गिरावट जब चल रही होती है तो हमेशा के लिए लगती है, लेकिन 2016 से 2025 तक NIFTY 50 अपनी हर बड़ी गिरावट से उबरा, और उसके सबसे अच्छे दिन अक्सर सबसे बुरे दिनों के ठीक बाद आए। बेचने से नुकसान पक्का हो जाता है, और फिर यह तय करना पड़ता है कि वापस कब ख़रीदें, जो और भी मुश्किल है। ज़्यादातर लोग बाद में, ऊँचे भाव पर वापस ख़रीदते हैं।' },
    fomo: { title: 'बड़ी तेज़ी के बाद ख़रीदना', body: 'तेज़ उछाल के बाद ख़रीदना सुरक्षित लगता है, क्योंकि बाकी सब पहले ही ख़रीद चुके हैं। लेकिन जो भाव अभी-अभी उछला है, उसमें ऊपर की ओर चौंकाने की गुंजाइश कम होती है। हाल की कमाई देखकर ख़रीदने का मतलब है कमाई के बाद ख़रीदना, उसके दौरान नहीं।' },
    timeInMarket: { title: 'बाज़ार में टिके रहना', body: 'अगला महीना कैसा होगा, यह कोई भी भरोसे से नहीं जानता, जानकार भी नहीं। Data यह ज़रूर दिखाता है कि उतार-चढ़ाव के बीच लगा रहा पैसा लंबे समय में बढ़ा है। टिके रहना भी एक फ़ैसला है, और अक्सर सबसे सस्ता।' },
    costs: { title: 'ख़र्चे कैसे जुड़ते हैं', body: 'हर trade पर थोड़ा ख़र्चा लगता है: STT, exchange fees, stamp duty, GST और बेचने पर depository charge। ₹1 लाख पर एक बार ख़रीदकर बेचने में करीब ₹240 लगते हैं। बार-बार trade करें तो ये छोटी रकमें चुपचाप मुनाफ़े का बड़ा हिस्सा खा जाती हैं।' },
    cash: { title: 'नकद बढ़ता नहीं', body: 'नकद में रखा पैसा गिरावट से बचा रहता है, पर हर तेज़ी से भी चूक जाता है। पिछले दस साल में इस game में नकद ने कुछ नहीं कमाया, जबकि index fund करीब तीन गुना हुआ। सही मौके का इंतज़ार अक्सर बहुत लंबा इंतज़ार बन जाता है।' },
    concentration: { title: 'सारे अंडे एक टोकरी में', body: 'एक stock बाज़ार से कहीं ज़्यादा गिर सकता है, और ऐसी वजहों से जिनका किसी को अंदाज़ा नहीं था। Index fund में 50 कंपनियाँ होती हैं, इसलिए कोई एक झटका उसे डुबा नहीं सकता। पैसा फैलाकर लगाना निवेश की एकमात्र मुफ़्त सुरक्षा है।' },
    luck: { title: 'एक जीत सबूत नहीं', body: 'एक-दो साल में बहुत लोग संयोग से index को पीछे छोड़ देते हैं, वैसे ही जैसे कुछ लोग लगातार पाँच बार सिक्का उछालकर जीत जाते हैं। हुनर कई दौरों में ही दिखता है। रहस्यमय दौर आज़माएँ, जहाँ आगे क्या हुआ यह जानने का सहारा नहीं होता।' },
    indexFund: { title: 'Index fund को हराना मुश्किल क्यों है', body: 'Index fund पूरे बाज़ार का मालिक है, कभी घबराता नहीं, कभी पीछे नहीं भागता, और लगभग कोई ख़र्चा नहीं देता। उसे हराने के लिए आपके चुने stocks को सभी 50 कंपनियों से मिलकर बेहतर करना होगा, अपने अतिरिक्त ख़र्चों के बाद। ज़्यादातर professional funds दस साल में ऐसा नहीं कर पाते।' },
    survivorship: { title: 'Survivorship bias', body: 'इस game के stocks आज के NIFTY 50 हैं: वे कंपनियाँ जिन्होंने इतना अच्छा किया कि आज उसमें हैं। 2016 में आप यह नहीं जान सकते थे कि वे कौन होंगी, और तब के कुछ सदस्य index से बाहर हो चुके हैं। विजेताओं की सूची में से चुनना पुराने समय को असल से आसान दिखाता है।' },
    sip: { title: 'SIP सफ़र को आसान क्यों बनाती है', body: 'हर महीने एक ही रकम, भाव कम होने पर ज़्यादा units ख़रीदती है और ज़्यादा होने पर कम, इसलिए सही मौके का अंदाज़ा लगाने की ज़रूरत नहीं पड़ती। यह गिरावट को झटके से सेल में बदल देती है। सबसे मुश्किल हिस्सा बस रुकना नहीं है।' },
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
    rightInTesting: (rate, years) => `testing में ${rate} सही${years ? `, ${years}` : ''}`,
    belowCoinFlip: (symbol, rate) => `${symbol} पर: testing में ${rate}, सिक्का उछालने से भी कम`,
    biggestFactors: 'सबसे बड़े कारण',
    noStandout: 'कोई एक ख़ास कारण नहीं।',
    reversalLink: 'यह उल्टी दिशा में क्यों दिख सकता है? Reversal के बारे में →',
    open: (symbol) => `${symbol} खोलें →`,
    range: (low, high) => `शायद ${low}–${high}%`,
    receiptAll: (rate, n, years) => `Testing${years ? ` (${years})` : ''} की ${n} calls में से ${rate} सही रहीं।`,
    receiptHoldout: (rate, n, years) => `सिर्फ़ ${years} पर, जिसे आख़िरी test तक देखा नहीं गया था: ${n} calls में ${rate}।`,
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
    notYet: 'अभी नतीजा नहीं',
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
      liveRecord: { term: 'Live record', short: 'नतीजा पता चलने से पहले प्रकाशित calls, जिनका बाद में नतीजा तय हुआ। Testing के उलट, इन्हें बाद में दोबारा चलाया या बदला नहीं जाता।', example: 'Parakh की हर call बाज़ार खुलने से पहले सेव होती है, और database उसमें बदलाव रोकता है।' },
      tradingDay: { term: 'Trading day', short: 'वह दिन जब stock exchange खुला रहता है: सोमवार से शुक्रवार, बाज़ार की छुट्टियों को छोड़कर।', example: '5 trading days आमतौर पर एक हफ़्ता होते हैं।' },
      candle: { term: 'Candlestick', short: 'एक दिन के भाव एक आकार में। Box खुलने के भाव से बंद होने के भाव तक जाता है, और पतली रेखा दिन के सबसे कम से सबसे ऊँचे भाव तक।', example: 'हरी candle खुलने से ऊपर बंद हुई; लाल candle नीचे।' },
      movingAverage: { term: '20-day average', short: 'पिछले 20 trading days के बंद भावों का औसत। यह रोज़ के शोर को हटाकर trend दिखाता है।', example: 'जो भाव अपने 20-day average से ऊपर है, वह हाल में चढ़ रहा है।' },
      volume: { term: 'Volume', short: 'एक दिन में कितने shares ख़रीदे-बेचे गए। अचानक उछाल का मतलब अक्सर कोई ख़बर होता है।', example: 'आम से 3× volume मतलब सामान्य से तीन गुना कारोबार।' },
      costs: { term: 'Trading के ख़र्चे', short: 'हर बार ख़रीदने या बेचने पर लगने वाला पैसा: brokerage, securities transaction tax (STT), exchange fees, stamp duty और GST। एक बार ख़रीदकर बेचने में करीब 0.25% लगता है।', example: 'जो trade ख़र्चों से पहले 0.1% कमाता है, वह ख़र्चों के बाद नुकसान में है।' },
      reversal: { term: 'Reversal', short: 'जब पिछले हफ़्ते के सबसे बड़े gainers वापस गिरते हैं और सबसे बड़े losers पकड़ बना लेते हैं। Parakh का नियम इसी रुझान पर बना है।', example: 'जो stock पिछले हफ़्ते बाकियों से 8% आगे था, उस पर bearish झुकाव है।' },
      week52: { term: '52-week high और low', short: 'पिछले एक साल का सबसे ऊँचा और सबसे कम भाव। ये बताते हैं कि आज का भाव हाल की range में कहाँ है।', example: '52-week high पर stock इस साल कभी इतना महँगा नहीं रहा।' },
      sector: { term: 'Sector', short: 'एक ही तरह के कारोबार वाली कंपनियों का समूह, जैसे बैंक, IT या सीमेंट। एक sector के stocks अक्सर साथ चलते हैं।', example: 'TCS और Infosys दोनों IT sector में हैं।' },
      drawdown: { term: 'Drawdown', short: 'कोई निवेश अपने सबसे ऊँचे स्तर से कितना गिरा। यह बताता है कि बुरा समय कितना तकलीफ़देह था।', example: '₹1,20,000 से ₹90,000 तक गिरना 25% drawdown है।' },
      pricedIn: { term: 'Priced in', short: 'जब कोई ख़बर पहले से stock के भाव में शामिल हो चुकी हो। भाव मिनटों में प्रतिक्रिया देते हैं, इसलिए जब तक आप ख़बर पढ़ते हैं, उस पर trade करना आमतौर पर देर हो चुकी होती है।', example: 'नतीजे दोपहर 3 बजे उम्मीद से बेहतर आए; 3:05 तक share पहले ही उछल चुका था।' },
      survivorship: { term: 'Survivorship bias', short: 'सिर्फ़ उन विजेताओं को देखना जो टिके रहे, जिससे पुराना समय असल से आसान लगता है। आज का NIFTY 50 उन कंपनियों से भरा है जिन्होंने अच्छा किया।', example: '2016 में आज के 50 stocks में से चुनना, उन कंपनियों को छिपा देता है जो index से बाहर हो गईं।' },
    },
  },
}
