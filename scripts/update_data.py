import json
import re
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

OPENAPI = "https://openapi.twse.com.tw/v1"
YAHOO_SPARK = "https://query1.finance.yahoo.com/v7/finance/spark"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "etf-universe.js"
FEATURED = [
    "0050", "0052", "00631L", "00935", "00981A", 
    "00991A", "00980A", "00988A", "00924", "009800", 
    "00646", "00830"
]


def get_json(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8-sig"))


def openapi(path):
    return get_json(OPENAPI + path)


def number(value):
    try:
        return float(str(value or "").replace(",", "").replace("+", "").strip())
    except (TypeError, ValueError):
        return 0.0


def chunks(values, size):
    for index in range(0, len(values), size):
        yield values[index : index + size]


def split_adjusted(values):
    if not values:
        return []
    adjusted = [0.0] * len(values)
    factor = 1.0
    for index in range(len(values) - 1, -1, -1):
        current = values[index]
        adjusted[index] = current * factor
        if index > 0 and values[index - 1] > 0:
            ratio = current / values[index - 1]
            if ratio < 0.55 or ratio > 1.82:
                factor *= ratio
    return adjusted


# 1. 取得證交所清單與當日行情
funds = openapi("/opendata/t187ap47_L")
daily = openapi("/exchangeReport/STOCK_DAY_ALL")
daily_by_code = {str(item.get("Code", "")).strip(): item for item in daily}

stock_funds = {}
active_codes = set()
for fund in funds:
    code = str(fund.get("基金代號", "")).strip()
    kind = str(fund.get("基金類型", ""))
    name = str(fund.get("基金簡稱", "")).strip()
    if code and re.fullmatch(r"[0-9A-Z]{4,6}", code) and code in daily_by_code:
        stock_funds[code] = name
        if "主動" in kind:
            active_codes.add(code)

if not stock_funds:
    raise RuntimeError("證交所 API 未回傳可辨識的 ETF 資料")

# 2. 批次取得 Yahoo Finance 歷史收盤價計算 52 週高點與回跌
symbols = [f"{code}.TW" for code in stock_funds]
history = {}
for batch in chunks(symbols, 10):
    try:
        query = urllib.parse.urlencode({
            "symbols": ",".join(batch),
            "range": "1y",
            "interval": "1d",
        })
        payload = get_json(f"{YAHOO_SPARK}?{query}")
        for result in payload.get("spark", {}).get("result", []):
            code = str(result.get("symbol", "")).removesuffix(".TW")
            response = (result.get("response") or [{}])[0]
            quote = ((response.get("indicators") or {}).get("quote") or [{}])[0]
            closes = [number(val) for val in quote.get("close", []) if val is not None]
            history[code] = {"closes": closes}
    except Exception as e:
        print(f"Batch fetch error for {batch}: {e}")

# 3. 解析最新資料日期 (支援民國年 7 碼與西元年 8 碼)
sample = next(iter(daily_by_code.values()))
raw_date = str(sample.get("Date", "")).strip()

if len(raw_date) == 7:
    as_of = f"{int(raw_date[:3]) + 1911:04d}-{raw_date[3:5]}-{raw_date[5:7]}"
elif len(raw_date) == 8:
    as_of = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
else:
    as_of = datetime.now().strftime("%Y-%m-%d")

# 4. 組裝資料並計算指標
rows = []
for code, fund_name in stock_funds.items():
    item = daily_by_code[code]
    close = number(item.get("ClosingPrice"))
    change = number(item.get("Change"))
    previous = close - change
    if close <= 0:
        continue

    prices = history.get(code, {})
    closes = prices.get("closes", [])
    adjusted_closes = split_adjusted(closes)
    week_base = closes[-6] if len(closes) >= 6 else (closes[0] if closes else previous)
    high52 = max(adjusted_closes + [close])
    name = str(item.get("Name") or fund_name).strip()

    rows.append({
        "code": code,
        "name": name,
        "type": "active" if code in active_codes else "passive",
        "close": round(close, 2),
        "dailyReturn": round(change / previous * 100, 2) if previous else 0,
        "weeklyReturn": round((close / week_base - 1) * 100, 2) if week_base else 0,
        "volume": int(number(item.get("TradeVolume"))),
        "value": int(number(item.get("TradeValue"))),
        "high52": round(high52, 2),
        "drawdown": round((close / high52 - 1) * 100, 2) if high52 else 0,
    })

rows.sort(key=lambda row: row["dailyReturn"], reverse=True)

# 5. 輸出至目標檔案
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
payload = {"asOf": as_of, "featured": FEATURED, "rows": rows}
OUTPUT.write_text(
    "window.ETF_DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"Updated {len(rows)} ETFs as of {as_of}; active={sum(r['type']=='active' for r in rows)}, passive={sum(r['type']=='passive' for r in rows)}")
