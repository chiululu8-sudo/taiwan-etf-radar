const data=window.ETF_DATA||{asOf:'',featured:[],rows:[]};
const universe=data.rows||[];
const nf=new Intl.NumberFormat('zh-TW');
const money=n=>n>=1e8?`${(n/1e8).toFixed(2)} 億`:n>=1e4?`${(n/1e4).toFixed(1)} 萬`:nf.format(n);
let period='daily';

const funds={
'0050':{name:'元大台灣50',theme:'追蹤臺灣 50 指數，以大型權值股為核心。',holdings:[['台積電',61.68],['台達電',4.18],['鴻海',3.96],['聯發科',3.41],['廣達',1.72],['富邦金',1.55],['國泰金',1.48],['日月光投控',1.37],['中信金',1.27],['聯電',1.09]]},
'006208':{name:'富邦台50',theme:'追蹤臺灣 50 指數，聚焦台灣大型龍頭企業。',holdings:[['台積電',61.55],['台達電',4.20],['鴻海',3.94],['聯發科',3.39],['廣達',1.73],['富邦金',1.56],['國泰金',1.47],['日月光投控',1.36],['中信金',1.28],['聯電',1.10]]},
'0056':{name:'元大高股息',theme:'從大型與中型股票中篩選預期高股息標的。',holdings:[['聯發科',5.08],['中信金',4.72],['聯電',4.48],['日月光投控',4.31],['廣達',4.07],['華碩',3.89],['長榮',3.76],['聯詠',3.62],['陽明',3.51],['瑞昱',3.35]]},
'00713':{name:'元大台灣高息低波',theme:'兼顧高股息與低波動特性的台灣股票組合。',holdings:[['遠傳',9.12],['台灣大',8.74],['統一',7.45],['中華電',7.18],['華南金',5.62],['玉山金',5.21],['兆豐金',4.88],['第一金',4.56],['上海商銀',4.17],['統一超',3.95]]},
'00878':{name:'國泰永續高股息',theme:'兼顧 ESG、股息與波動度的台灣高股息組合。',holdings:[['國泰金',5.66],['中信金',5.43],['富邦金',5.12],['聯電',4.95],['聯發科',4.72],['日月光投控',4.41],['廣達',4.19],['華碩',3.92],['光寶科',3.64],['仁寶',3.28]]},
'00915':{name:'凱基優選高股息30',theme:'挑選具股息與獲利品質的台灣上市櫃公司。',holdings:[['中信金',7.15],['聯電',6.62],['國泰金',6.08],['長榮',5.72],['華碩',5.18],['聯發科',4.72],['日月光投控',4.31],['瑞昱',3.96],['廣達',3.74],['統一',3.41]]},
'00918':{name:'大華優利高填息30',theme:'聚焦股息品質與歷史填息表現的台灣股票。',holdings:[['中信金',8.03],['國泰金',6.84],['聯電',6.25],['長榮',5.78],['富邦金',5.31],['華碩',4.86],['聯發科',4.55],['日月光投控',4.14],['陽明',3.78],['瑞昱',3.42]]},
'00919':{name:'群益台灣精選高息',theme:'以高股息為核心，搭配獲利能力與波動度條件。',holdings:[['中信金',8.72],['國泰金',7.16],['富邦金',6.54],['聯電',5.86],['長榮',5.31],['華碩',4.72],['聯發科',4.39],['日月光投控',4.11],['陽明',3.84],['瑞昱',3.57]]},
'00929':{name:'復華台灣科技優息',theme:'聚焦台灣科技產業，兼顧股息收益。',holdings:[['聯電',6.82],['聯發科',6.31],['日月光投控',5.78],['華碩',5.24],['聯詠',4.86],['瑞昱',4.55],['光寶科',4.17],['仁寶',3.92],['緯創',3.68],['廣達',3.41]]},
'00940':{name:'元大台灣價值高息',theme:'以價值與股息條件篩選台灣上市櫃股票。',holdings:[['長榮',7.14],['中信金',6.68],['聯電',6.11],['國泰金',5.76],['富邦金',5.34],['華碩',4.92],['聯發科',4.48],['日月光投控',4.06],['陽明',3.75],['瑞昱',3.39]]}
};

function drawdownInfo(value){
  if(value<=-10)return{label:'10% 保守區',className:'dd-deep'};
  if(value<=-5)return{label:'5% 分批區',className:'dd-watch'};
  return{label:'未達 5%',className:'dd-normal'};
}
function tableRows(rows,withRank=true){
  if(!rows.length)return'<tr><td colspan="8">目前沒有符合條件的 ETF。</td></tr>';
  return rows.map((r,i)=>{const ret=period==='daily'?r.dailyReturn:r.weeklyReturn;const dd=drawdownInfo(r.drawdown);return `<tr><td class="rank">${withRank?String(i+1).padStart(2,'0'):'—'}</td><td class="etf-cell"><b>${r.code}</b><span>${r.name}</span></td><td>${r.close.toFixed(2)}</td><td class="${ret>=0?'positive':'negative'}">${ret>=0?'+':''}${ret.toFixed(2)}%</td><td>${r.high52.toFixed(2)}</td><td class="drawdown ${dd.className}">${r.drawdown.toFixed(2)}%</td><td><span class="zone ${dd.className}">${dd.label}</span></td><td>${money(r.value)}</td></tr>`}).join('');
}
function rankingTable(type,title){
  const key=period==='daily'?'dailyReturn':'weeklyReturn';
  const rows=universe.filter(r=>r.type===type).sort((a,b)=>b[key]-a[key]).slice(0,30);
  return `<article class="ranking-block"><div class="ranking-title"><span>${type==='active'?'ACTIVE':'INDEX'}</span><h3>${title}</h3><b>${rows.length} 檔</b></div><div class="table-wrap"><table><thead><tr><th>排名</th><th>ETF</th><th>收盤價</th><th>${period==='daily'?'單日':'五日'}報酬</th><th>52週最高收盤</th><th>高點回跌</th><th>參考區間</th><th>成交金額</th></tr></thead><tbody>${tableRows(rows)}</tbody></table></div></article>`;
}
function renderRanking(){
  const q=document.querySelector('#search').value.trim().toLowerCase();
  if(q){
    const rows=universe.filter(r=>(r.code+r.name).toLowerCase().includes(q));
    document.querySelector('#rankings').innerHTML=`<article class="ranking-block wide"><div class="ranking-title"><span>SEARCH</span><h3>搜尋結果</h3><b>${rows.length} 檔</b></div><div class="table-wrap"><table><thead><tr><th>排名</th><th>ETF</th><th>收盤價</th><th>${period==='daily'?'單日':'五日'}報酬</th><th>52週最高收盤</th><th>高點回跌</th><th>參考區間</th><th>成交金額</th></tr></thead><tbody>${tableRows(rows,false)}</tbody></table></div></article>`;
  }else{
    document.querySelector('#rankings').innerHTML=rankingTable('active','主動式 ETF 前 30')+rankingTable('passive','被動式 ETF 前 30');
  }
  document.querySelector('#period-note').textContent=`台灣掛牌 ETF · 依 ${data.asOf.replaceAll('-','/')} ${period==='daily'?'單日':'最近五個交易日'}報酬排序`;
}
function renderWatchlist(){
  const rows=data.featured.map(code=>universe.find(r=>r.code===code)).filter(Boolean);
  document.querySelector('#watchlist-body').innerHTML=rows.map(r=>{const dd=drawdownInfo(r.drawdown);return `<tr><td class="etf-cell"><b>${r.code}</b><span>${r.name}</span></td><td><span class="type-pill ${r.type}">${r.type==='active'?'主動式':'被動式'}</span></td><td>${r.close.toFixed(2)}</td><td>${r.high52.toFixed(2)}</td><td class="drawdown ${dd.className}">${r.drawdown.toFixed(2)}%</td><td><span class="zone ${dd.className}">${dd.label}</span></td></tr>`}).join('')||'<tr><td colspan="6">觀察清單資料載入中。</td></tr>';
}

document.querySelectorAll('.tabs button').forEach(button=>button.addEventListener('click',()=>{period=button.dataset.period;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===button));renderRanking()}));
document.querySelector('#search').addEventListener('input',renderRanking);
const select=document.querySelector('#etf-select');
select.innerHTML=Object.entries(funds).map(([code,f])=>`<option value="${code}">${code} ${f.name}</option>`).join('');
function renderHoldings(){const code=select.value||'0050',f=funds[code],total=f.holdings.reduce((sum,row)=>sum+row[1],0);document.querySelector('#fund-code').textContent=code;document.querySelector('#fund-name').textContent=f.name;document.querySelector('#fund-theme').textContent=f.theme;document.querySelector('#holding-total').textContent=total.toFixed(1)+'%';document.querySelector('#holding-bars').innerHTML=f.holdings.map((h,i)=>`<div class="bar-row"><span class="no">${String(i+1).padStart(2,'0')}</span><div><div class="company"><b>${h[0]}</b></div><div class="track"><div class="fill" style="width:${Math.min(h[1]/65*100,100)}%"></div></div></div><strong>${h[1].toFixed(2)}%</strong></div>`).join('')}
select.addEventListener('change',renderHoldings);
document.querySelector('#download').addEventListener('click',()=>{const key=period==='daily'?'dailyReturn':'weeklyReturn';const ranked=['active','passive'].flatMap(type=>universe.filter(r=>r.type===type).sort((a,b)=>b[key]-a[key]).slice(0,30));const head=['類型','排名','代號','ETF 名稱','收盤價',period==='daily'?'單日報酬(%)':'五日報酬(%)','52週最高收盤價','高點回跌(%)','成交量','成交金額'];const body=ranked.map((r,i)=>[r.type==='active'?'主動式':'被動式',i%30+1,r.code,`"${r.name}"`,r.close,r[key],r.high52,r.drawdown,r.volume,r.value]);const csv='\ufeff'+[head,...body].map(row=>row.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`ETF_${period==='daily'?'每日':'每週'}主動被動前30_${data.asOf}.csv`;a.click();URL.revokeObjectURL(a.href)});

if(data.asOf){const [year,month,day]=data.asOf.split('-');document.querySelector('#market-date').textContent=`${month}.${day}`;document.querySelector('#market-year').textContent=`${year} · 台北`;document.querySelector('#footer-date').textContent=`資料快照 ${year}/${month}/${day} · 每個交易日更新`;}
renderRanking();renderWatchlist();renderHoldings();
