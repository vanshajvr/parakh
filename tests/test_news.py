from datetime import datetime, timezone

from jobs.news import TERMS, TIPS, parse, select
from ml import config

NOW = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)

FEED = b"""<?xml version="1.0"?><rss><channel>
<item><title>Titan Company profit rises 20% - Mint</title><link>https://n/1</link>
  <pubDate>Fri, 23 Oct 2026 10:00:00 GMT</pubDate><source url="https://mint">Mint</source></item>
<item><title>Titan Company profit rises 20% - Business Standard</title><link>https://n/2</link>
  <pubDate>Fri, 23 Oct 2026 09:00:00 GMT</pubDate><source url="https://bs">Business Standard</source></item>
<item><title>Titan Biotech announces bonus shares - Hindustan</title><link>https://n/3</link>
  <pubDate>Fri, 23 Oct 2026 08:00:00 GMT</pubDate><source url="https://h">Hindustan</source></item>
<item><title>Titan shares: target price raised by brokerage - ET</title><link>https://n/4</link>
  <pubDate>Fri, 23 Oct 2026 07:00:00 GMT</pubDate><source url="https://et">ET</source></item>
<item><title>Titan Company Q1 results - Mint</title><link>https://n/5</link>
  <pubDate>Mon, 12 Oct 2026 07:00:00 GMT</pubDate><source url="https://mint">Mint</source></item>
</channel></rss>"""


def test_every_nifty_stock_has_search_terms():
    assert set(TERMS) == set(config.MARKET)


def test_parse_drops_the_source_suffix_google_adds():
    items = parse(FEED)
    assert items[0] == {"title": "Titan Company profit rises 20%", "source": "Mint", "url": "https://n/1",
                        "published_at": datetime(2026, 10, 23, 10, 0, tzinfo=timezone.utc)}


def test_select_keeps_one_recent_on_topic_story_and_no_tips():
    kept = select(parse(FEED), TERMS["TITAN.NS"], NOW)
    # The syndicated copy, the other "Titan", the tip and the 12-day-old story are all dropped.
    assert [k["url"] for k in kept] == ["https://n/1"]


def test_names_need_the_company_not_a_lookalike():
    assert not TERMS["TRENT.NS"].names("Severn Trent shares rise")
    assert TERMS["TRENT.NS"].names("Zudio drives Trent Q2 growth")
    assert not TERMS["INDIGO.NS"].names("Indigo dye prices climb")
    assert TERMS["INDIGO.NS"].names("IndiGo adds 20 flights")
    assert not TERMS["RELIANCE.NS"].names("Reliance Power shares jump")
    assert TERMS["RELIANCE.NS"].names("रिलायंस इंडस्ट्रीज के शेयर चढ़े")
    assert not TERMS["BSE.NS"].names("XYZ Ltd lists on BSE")


def test_tips_are_recognised_in_both_languages():
    assert TIPS.search("5 stocks to buy this Diwali")
    assert TIPS.search("ब्रोकरेज ने दी BUY रेटिंग")
    assert not TIPS.search("TCS declares dividend")


def test_headlines_must_be_about_the_business():
    from jobs.news import BUSINESS
    assert BUSINESS.search("JSW Steel profit more than triples")
    assert BUSINESS.search("टाटा मोटर्स के नतीजे जारी")
    assert not BUSINESS.search("Bomb threat on IndiGo flight triggers checks")
    assert not BUSINESS.search("टाटा स्टील कैंटीन में हंगामा")
