import json, re, urllib.request
from pathlib import Path

BASE = "https://openapi.twse.com.tw/v1"
ROOT = Path(__file__).resolve().parents[1]

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent":"Taiwan-ETF-Radar/2.0","Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))

def number(value):
    try: return float(str(value or "").replace(",", "").replace("+", "").strip())
    except ValueError: return 0.0

funds = get("/opendata/t187ap47_L")
daily = get("/exchangeReport/STOCK_DAY_ALL")
taiwan_funds = {}
for fund in funds:
    code = str(fund.get("基金代號", "")).strip()
    kind = str(fund.get("基金類型", ""))
    foreign = str(fund.get("是否包含國外成分股", ""))
    name = str(fund.get("基金簡稱", "")).strip()
    if code and "股票" in kind and foreign == "否" and not re.search(r"反向|槓桿", kind + name):
        taiwan_funds[code] = name

rows = []
for item in daily:
    code = str(item.get("Code", "")).strip()
    if code not in taiwan_funds: continue
    close, change = number(item.get("ClosingPrice")), number(item.get("Change"))
    previous = close - change
    rows.append([code, str(item.get("Name") or taiwan_funds[code]).strip(), round(close,2), round(change/previous*100,2) if previous else 0, int(number(item.get("TradeVolume"))), int(number(item.get("TradeValue")))])

if not rows: raise RuntimeError("證交所 API 未回傳可辨識的台灣股票型 ETF 資料")
rows.sort(key=lambda row: row[3], reverse=True)
(ROOT/"data"/"etf-universe.js").write_text("window.ETF_UNIVERSE="+json.dumps(rows,ensure_ascii=False,separators=(",",":"))+";\n", encoding="utf-8")
print(f"Updated {len(rows)} Taiwan equity ETFs")
