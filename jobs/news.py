"""News job: recent headlines for each NIFTY 50 stock, in English and Hindi (decision D-037).

Headlines come from Google News RSS searches. Only the headline, source, time and link are kept;
article text is never copied. A headline counts for a stock only if its title names the company,
and headlines that are stock tips ("stocks to buy", "target price") are dropped: Parakh shows
news as context for a move, never as a reason to trade.

Runs every few hours (GitHub Actions). Safe to re-run: rows are keyed by stock, language and link.

Usage: python -m jobs.news
"""

import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

from ledger import db
from ml import config

MAX_AGE = timedelta(days=3)
KEEP_FOR = timedelta(days=7)
PER_STOCK = 10
PAUSE_SECONDS = 1.0
FEED = "https://news.google.com/rss/search?q={q}&hl={hl}&gl=IN&ceid={ceid}"
EDITIONS = {"en": ("en-IN", "IN:en"), "hi": ("hi", "IN:hi")}
USER_AGENT = "Mozilla/5.0 (compatible; Parakh news; +https://parakh-bi78.vercel.app)"

# Tips and price predictions, not news. Parakh doesn't pass these on, even second-hand.
TIPS = re.compile(
    r"\b(stocks? to (buy|sell|watch)|buy or sell|should you buy|multibaggers?|stock picks?|top picks|"
    r"target price|price target|buy rating|sell rating|picks to watch|price prediction|share price forecast|"
    r"upside|death cross|golden cross|bearish trend|bullish trend|breakout)\b"
    r"|\b(BUY|SELL) रेटिंग|तेजी का अनुमान|खरीदें|बेचें|मल्टीबैगर|टारगेट|कमाई का मौका|दांव|खरीदारी की सलाह|Stocks to Buy"
    # Live quote and chart pages, which are listings rather than news.
    r"|Share Price Today|Live NSE|Stock Price (&|and) Chart|Price Today (&|and) Chart",
    re.IGNORECASE,
)
# Machine-written pages, estimate listings and signal services, not reporting.
BLOCKED_SOURCES = {
    "AD HOC NEWS", "ad-hoc-news.de", "TradingView", "TechGraph", "MarketScreener", "MarketsMojo",
    "Kalkine India", "Kalkine Media", "Univest",
}
# A headline must be about the business (results, deals, shares), not just mention the company:
# "IndiGo flight delayed" or a factory canteen dispute isn't market news.
BUSINESS = re.compile(
    r"\b(shares?|stocks?|results?|profit|loss|revenue|sales|earnings|Q[1-4]|FY\d\d|dividend|bonus|IPO|"
    r"stake|deal|acquir\w*|acquisition|merger|demerger|order|contract|crore|lakh|margin|guidance|outlook|"
    r"brokerage|investors?|market|Sensex|Nifty|valuation|capex|expansion|debt|bond|funding|rating|volumes?|"
    r"subsidiary|board|CEO|MD|SEBI|RBI)\b|₹|Rs\.?\s?\d"
    r"|शेयर|स्टॉक|नतीजे|नतीजों|मुनाफ|घाटा|घाटे|कमाई|रेवेन्यू|डिविडेंड|बोनस|हिस्सेदारी|सौदा|डील|अधिग्रहण|"
    r"विलय|ऑर्डर|करोड़|लाख|ब्रोकरेज|निवेश|बाजार|बाज़ार|सेंसेक्स|निफ्टी|कारोबार|बिक्री|कर्ज|सीईओ",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Terms:
    """How to find one company in the news: search words, and the names a headline must contain."""

    en: tuple[str, ...]
    hi: tuple[str, ...]
    exclude: str | None = None
    # Overrides the plain name match, for names that are also everyday words (Titan, Trent, Eternal).
    match: str | None = None

    def query(self, lang: str) -> str:
        if lang == "en":
            return "(" + " OR ".join(f'"{n}"' for n in self.en) + ") (share OR shares OR stock)"
        return "(" + " OR ".join(f'"{n}"' for n in (*self.hi, self.en[0])) + ") शेयर"

    def pattern(self) -> re.Pattern:
        latin = self.match or "|".join(rf"\b{re.escape(n)}\b" for n in self.en)
        # Devanagari has no reliable word boundaries in `re`, so those names match as plain text.
        return re.compile("|".join([latin, *map(re.escape, self.hi)]), re.IGNORECASE)

    def names(self, title: str) -> bool:
        return bool(self.pattern().search(title)) and not (self.exclude and re.search(self.exclude, title, re.IGNORECASE))


TERMS: dict[str, Terms] = {
    "ADANIENT.NS": Terms(("Adani Enterprises",), ("अदाणी एंटरप्राइजेज", "अडानी एंटरप्राइजेज")),
    "ADANIPORTS.NS": Terms(("Adani Ports",), ("अदाणी पोर्ट्स", "अडानी पोर्ट्स")),
    "APOLLOHOSP.NS": Terms(("Apollo Hospitals",), ("अपोलो हॉस्पिटल",)),
    "ASIANPAINT.NS": Terms(("Asian Paints",), ("एशियन पेंट्स",)),
    "AXISBANK.NS": Terms(("Axis Bank",), ("एक्सिस बैंक",)),
    "BAJAJ-AUTO.NS": Terms(("Bajaj Auto",), ("बजाज ऑटो",)),
    "BAJFINANCE.NS": Terms(("Bajaj Finance",), ("बजाज फाइनेंस",)),
    "BAJAJFINSV.NS": Terms(("Bajaj Finserv",), ("बजाज फिनसर्व",)),
    "BEL.NS": Terms(("Bharat Electronics", "BEL"), ("भारत इलेक्ट्रॉनिक्स",)),
    "BHARTIARTL.NS": Terms(("Bharti Airtel", "Airtel"), ("एयरटेल",)),
    # "BSE" is also the exchange every company lists on, so only the company's own shares count.
    "BSE.NS": Terms(("BSE",), ("बीएसई के शेयर",), match=r"\bBSE('s)? (shares?|stock|Ltd|Limited|Q\d|results)\b|\bBSE के शेयर"),
    "CIPLA.NS": Terms(("Cipla",), ("सिप्ला",)),
    "COALINDIA.NS": Terms(("Coal India",), ("कोल इंडिया",)),
    "DRREDDY.NS": Terms(("Dr Reddy's", "Dr. Reddy's"), ("डॉ रेड्डी", "डॉ. रेड्डी"), match=r"\bDr\.? Reddy"),
    "EICHERMOT.NS": Terms(("Eicher Motors",), ("आयशर मोटर्स",), match=r"\bEicher\b"),
    "ETERNAL.NS": Terms(("Eternal", "Zomato"), ("इटरनल", "जोमैटो", "ज़ोमैटो"),
                        match=r"\bEternal('s)? (shares?|stock|Ltd|Q\d|results)\b|\bZomato\b|\bBlinkit\b"),
    "GRASIM.NS": Terms(("Grasim",), ("ग्रासिम",)),
    "HCLTECH.NS": Terms(("HCLTech", "HCL Tech"), ("एचसीएल टेक",), match=r"\bHCL ?Tech"),
    "HDFCBANK.NS": Terms(("HDFC Bank",), ("एचडीएफसी बैंक",)),
    "HDFCLIFE.NS": Terms(("HDFC Life",), ("एचडीएफसी लाइफ",)),
    "HINDALCO.NS": Terms(("Hindalco",), ("हिंडाल्को",)),
    "HINDUNILVR.NS": Terms(("Hindustan Unilever", "HUL"), ("हिंदुस्तान यूनिलीवर",)),
    "ICICIBANK.NS": Terms(("ICICI Bank",), ("आईसीआईसीआई बैंक",)),
    # Case-sensitive "IndiGo", so the colour doesn't count.
    "INDIGO.NS": Terms(("IndiGo", "InterGlobe Aviation"), ("इंडिगो",), match=r"(?-i:\bIndiGo\b)|\bInterGlobe\b"),
    "INFY.NS": Terms(("Infosys",), ("इंफोसिस",)),
    "ITC.NS": Terms(("ITC",), ("आईटीसी",), exclude=r"ITC Neocloud|ITC Hotels"),
    "JIOFIN.NS": Terms(("Jio Financial", "JFSL"), ("जियो फाइनेंशियल",)),
    "JSWSTEEL.NS": Terms(("JSW Steel",), ("जेएसडब्ल्यू स्टील",)),
    "KOTAKBANK.NS": Terms(("Kotak Mahindra Bank", "Kotak Bank"), ("कोटक महिंद्रा बैंक", "कोटक बैंक")),
    "LT.NS": Terms(("Larsen & Toubro", "L&T"), ("लार्सन", "एलएंडटी"), match=r"\bLarsen\b|\bL&T\b", exclude=r"L&T (Finance|Technology|Tech|Mindtree)|LTIMindtree"),
    "M&M.NS": Terms(("Mahindra & Mahindra", "M&M"), ("महिंद्रा एंड महिंद्रा",), match=r"\bMahindra (&|and) Mahindra\b|\bM&M\b"),
    "MARUTI.NS": Terms(("Maruti Suzuki",), ("मारुति",), match=r"\bMaruti\b"),
    "MAXHEALTH.NS": Terms(("Max Healthcare",), ("मैक्स हेल्थकेयर",)),
    "NESTLEIND.NS": Terms(("Nestle India", "Nestlé India"), ("नेस्ले इंडिया",)),
    "NTPC.NS": Terms(("NTPC",), ("एनटीपीसी",), exclude=r"NTPC Green|एनटीपीसी ग्रीन"),
    "ONGC.NS": Terms(("ONGC",), ("ओएनजीसी",)),
    "POWERGRID.NS": Terms(("Power Grid",), ("पावर ग्रिड",), match=r"\bPower ?Grid\b|\bPOWERGRID\b"),
    "RELIANCE.NS": Terms(("Reliance Industries", "RIL"), ("रिलायंस इंडस्ट्रीज", "रिलायंस"),
                         match=r"\bReliance Industries\b|\bRIL\b|\bReliance('s)? (shares?|stock)\b",
                         exclude=r"Reliance (Power|Infra|Infrastructure|Capital|Home|Communications)|रिलायंस (पावर|इंफ्रा)"),
    "SBILIFE.NS": Terms(("SBI Life",), ("एसबीआई लाइफ",)),
    "SHRIRAMFIN.NS": Terms(("Shriram Finance",), ("श्रीराम फाइनेंस",)),
    "SBIN.NS": Terms(("State Bank of India", "SBI"), ("स्टेट बैंक", "एसबीआई"),
                     exclude=r"SBI (Life|Card|Cards|General|MF|Mutual)|एसबीआई (लाइफ|कार्ड)"),
    "SUNPHARMA.NS": Terms(("Sun Pharma",), ("सन फार्मा",)),
    "TCS.NS": Terms(("TCS", "Tata Consultancy Services"), ("टीसीएस",)),
    "TATACONSUM.NS": Terms(("Tata Consumer",), ("टाटा कंज्यूमर",)),
    "TMPV.NS": Terms(("Tata Motors",), ("टाटा मोटर्स",)),
    "TATASTEEL.NS": Terms(("Tata Steel",), ("टाटा स्टील",)),
    "TECHM.NS": Terms(("Tech Mahindra",), ("टेक महिंद्रा",)),
    "TITAN.NS": Terms(("Titan",), ("टाइटन",), match=r"\bTitan (Company|Co\b)|\bTitan('s)? (shares?|stock|Q\d|results)\b|\bTanishq\b",
                      exclude=r"Titan Biotech|टाइटन बायोटेक"),
    "TRENT.NS": Terms(("Trent",), ("ट्रेंट",), match=r"\bTrent('s)? (Ltd|shares?|stock|Q\d|results)\b|\bZudio\b|\bWestside\b",
                      exclude=r"Severn Trent"),
    "ULTRACEMCO.NS": Terms(("UltraTech Cement", "UltraTech"), ("अल्ट्राटेक",)),
}


def fetch(query: str, lang: str) -> bytes:
    hl, ceid = EDITIONS[lang]
    url = FEED.format(q=urllib.parse.quote(f"{query} when:3d"), hl=hl, ceid=ceid)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read()


def parse(xml: bytes) -> list[dict]:
    """Headline, source, link and time for each item. Google appends " - Source" to titles."""
    items = []
    for item in ET.fromstring(xml).iter("item"):
        title, source, link, when = (item.findtext(k) or "" for k in ("title", "source", "link", "pubDate"))
        if not (title and link and when):
            continue
        if source and title.endswith(f" - {source}"):
            title = title[: -len(source) - 3]
        items.append({"title": title.strip(), "source": source.strip(), "url": link.strip(),
                      "published_at": parsedate_to_datetime(when).astimezone(timezone.utc)})
    return items


def _key(title: str) -> str:
    return re.sub(r"\W+", "", title.lower())[:60]


def select(items: list[dict], terms: Terms, now: datetime) -> list[dict]:
    """Recent headlines about the company's business, without tips, one per story, newest first."""
    seen, kept = set(), []
    for it in sorted(items, key=lambda i: i["published_at"], reverse=True):
        if now - it["published_at"] > MAX_AGE or it["source"] in BLOCKED_SOURCES:
            continue
        title = it["title"]
        if not terms.names(title) or not BUSINESS.search(title) or TIPS.search(title) or _key(title) in seen:
            continue
        seen.add(_key(it["title"]))
        kept.append(it)
    return kept[:PER_STOCK]


def run(conn, now: datetime) -> str:
    rows, failed = [], 0
    for ticker in config.MARKET:
        terms = TERMS[ticker]
        for lang in EDITIONS:
            try:
                items = parse(fetch(terms.query(lang), lang))
            except Exception:  # one bad feed shouldn't cost the rest
                failed += 1
                continue
            rows += [{**it, "ticker": ticker, "lang": lang} for it in select(items, terms, now)]
            time.sleep(PAUSE_SECONDS)
    db.upsert_news(conn, rows)
    db.prune_news(conn, now - KEEP_FOR)
    return f"{len(rows)} headlines; {failed} feeds failed"


def main() -> None:
    with db.connect() as conn:
        db.ensure_schema(conn)
        detail = run(conn, datetime.now(timezone.utc))
        db.log_run(conn, "news", "ok", detail)
    print(detail)


if __name__ == "__main__":
    main()
