/* ===== Project SellOut =====
   Fonte: arquivo "project_sellout" (aba Order), uma linha por item de pedido de projeto no Brasil.
   Regras (as mesmas do mapa HTML original):
     - valor = Amount After Discount(USD), somando todas as linhas (cancelamentos se anulam com as reversões);
     - venda de serviço = tipo de pedido "仅开票" (só faturamento de serviço/software); o resto é venda de projeto;
     - estado = deduzido do nome da oportunidade (nome do estado, cidade, órgão conhecido ou sigla como "SES/DF", "- RS").
       Oportunidades nacionais ou sem local no nome ficam em "Sem estado".
     - status da linha: 已关闭 = faturado/fechado; 等待发运, 已输入, 已挑库 = em aberto (ainda não embarcado); 已取消 = cancelado. */

/* ---------- estado a partir do nome da oportunidade ---------- */
const SO_STATES = { 'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM', 'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', 'goias': 'GO', 'maranhao': 'MA',
  'mato grosso do sul': 'MS', 'mato grosso': 'MT', 'minas gerais': 'MG', 'paraiba': 'PB', 'parana': 'PR', 'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO' };
/* cidades e órgãos que aparecem nos nomes das oportunidades (dá pra acrescentar aqui) */
const SO_PLACES = { 'campinas': 'SP', 'limeira': 'SP', 'guarulhos': 'SP', 'santos': 'SP', 'sorocaba': 'SP', 'ribeirao preto': 'SP', 'franco da rocha': 'SP', 'sao bernardo': 'SP', 'osasco': 'SP',
  'jundiai': 'SP', 'barueri': 'SP', 'sao jose dos campos': 'SP', 'piracicaba': 'SP', 'bauru': 'SP', 'cptm': 'SP', 'sabesp': 'SP', 'pmesp': 'SP', 'metro sp': 'SP', 'metro de sao paulo': 'SP',
  'niteroi': 'RJ', 'cedae': 'RJ', 'pmerj': 'RJ', 'cbmrj': 'RJ', 'secc/rj': 'RJ', 'belo horizonte': 'MG', 'uberlandia': 'MG', 'contagem': 'MG', 'juiz de fora': 'MG', 'cemig': 'MG', 'copasa': 'MG',
  'vitoria': 'ES', 'vila velha': 'ES', 'aracruz': 'ES', 'cariacica': 'ES', 'detran-es': 'ES', 'detran/es': 'ES', 'seduc es': 'ES', 'curitiba': 'PR', 'londrina': 'PR', 'maringa': 'PR', 'cascavel': 'PR',
  'foz do iguacu': 'PR', 'ponta grossa': 'PR', 'pato branco': 'PR', 'araucaria': 'PR', 'copel': 'PR', 'sanepar': 'PR', 'florianopolis': 'SC', 'joinville': 'SC', 'blumenau': 'SC', 'chapeco': 'SC',
  'itajai': 'SC', 'celesc': 'SC', 'porto alegre': 'RS', 'canoas': 'RS', 'caxias do sul': 'RS', 'pelotas': 'RS', 'gramado': 'RS', 'santa maria': 'RS', 'brasilia': 'DF', 'ssp/df': 'DF', 'ses/df': 'DF',
  'goiania': 'GO', 'anapolis': 'GO', 'aguas lindas': 'GO', 'catalao': 'GO', 'sesi/go': 'GO', 'salvador': 'BA', 'feira de santana': 'BA', 'embasa': 'BA', 'fortaleza': 'CE', 'etice': 'CE', 'cagece': 'CE',
  'recife': 'PE', 'compesa': 'PE', 'joao pessoa': 'PB', 'jampa': 'PB', 'natal': 'RN', 'mossoro': 'RN', 'maceio': 'AL', 'aracaju': 'SE', 'sao luis': 'MA', 'teresina': 'PI', 'belem': 'PA', 'do para': 'PA',
  'manaus': 'AM', 'porto velho': 'RO', 'palmas': 'TO', 'porto nacional': 'TO', 'cuiaba': 'MT', 'campo grande': 'MS', 'macapa': 'AP', 'boa vista': 'RR', 'rio branco': 'AC' };
const SO_UFS = 'AC AL AP AM BA CE DF ES GO MA MS MT MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const soNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
function detectUF(name) {
  const raw = String(name || ''), n = soNorm(raw);
  /* padrão do CRM: "BR_<estado ou cidade>_..." */
  const m = n.match(/^\s*br[_ ]+([^_]+)_/);
  if (m) { const seg = m[1].trim(); if (SO_STATES[seg]) return SO_STATES[seg]; if (SO_PLACES[seg]) return SO_PLACES[seg]; if (seg.length === 2 && SO_UFS.includes(seg.toUpperCase())) return seg.toUpperCase(); }
  const c = [];
  const scan = (dict, bonus) => Object.entries(dict).forEach(([k, v]) => { const re = new RegExp('(^|[^a-z])' + reEsc(k) + '([^a-z]|$)', 'g'); let x; while ((x = re.exec(n))) c.push([x.index + bonus, v]); });
  scan(SO_STATES, 0);
  /* sigla em maiúsculas separada por /, -, _ ou espaço ("SES/DF", "Canoas - RS"); AC e AM ficam de fora (Access Control, AM/PM) */
  const re2 = /(?:^|[\s/_\-(])([A-Z]{2})(?=$|[\s/_\-).,])/g; let y;
  while ((y = re2.exec(raw))) { const u = y[1]; if (!SO_UFS.includes(u) || u === 'AC' || u === 'AM') continue;
    if (['TO', 'SE', 'AL', 'PA', 'MA', 'PI'].includes(u) && !new RegExp('(?:[-/]\\s*|\\s)' + u + '(?:$|[\\s).,])').test(raw)) continue; c.push([y.index + 400, u]); }
  scan(SO_PLACES, 800);
  if (!c.length) return null;
  if (new Set(c.map(x => x[1])).size > 2) return null;     // vários estados no nome: oportunidade multiestado
  return c.sort((a, b) => a[0] - b[0])[0][1];
}

/* ---------- leitura ---------- */
function parseSellout(wb) {
  const ws = wb.Sheets['Order']; if (!ws) return null;
  const rows = mapRows(ws, { d: 'Book Date', y: 'Book Date(Year)', mo: 'Book Date(Month)', ord: 'Order number', ot: 'Order type', rep: 'Sales Rep', acc: 'Actual Account',
    at: 'Account Type', pl: 'Primary product line', amt: 'Amount After Discount(USD)', ls: 'Line Status', opp: 'Opportunity No.', on: 'Opportunity Name', ind: 'Primary Industry' });
  const ufCache = {};
  return rows.filter(r => r.opp || r.ord).map(r => {
    const ls = String(r.ls || '');
    const o = { d: r.d, y: num(r.y), mo: num(r.mo), ord: r.ord != null ? String(r.ord) : null, svc: /仅开票/.test(String(r.ot || '')) ? 1 : 0, rep: r.rep, acc: r.acc, at: r.at, pl: r.pl,
      amt: num(r.amt) || 0, st: /^已取消/.test(ls) ? 'cancel' : /已关闭/.test(ls) ? 'done' : 'open', opp: r.opp, on: r.on, ind: r.ind && r.ind !== '-' ? r.ind : null };
    if (!o.y && o.d) { o.y = +String(o.d).slice(0, 4); o.mo = +String(o.d).slice(5, 7); }
    const k = o.opp || o.on; if (!(k in ufCache)) ufCache[k] = detectUF(o.on); o.uf = ufCache[k];
    return o;
  });
}

/* ---------- números de sell-out (usados na aba, na análise automática e no relatório) ---------- */
function soYears(rows) { return [...new Set(rows.map(r => r.y).filter(Boolean))].sort((a, b) => b - a); }
/* comparação ano a ano: meses fechados do ano (o mês corrente do ano mais recente fica de fora, está incompleto) */
function soYtd(rows, Y) {
  const latest = soYears(rows)[0], maxMo = Math.max(0, ...rows.filter(r => r.y === Y).map(r => r.mo || 0));
  const lastMo = Y === latest ? maxMo - 1 : maxMo;
  if (lastMo < 1) return null;
  const sum = y => rows.filter(r => r.y === y && r.mo <= lastMo).reduce((a, r) => a + r.amt, 0);
  const a = sum(Y), b = sum(Y - 1);
  return rows.some(r => r.y === Y - 1) ? { a, b, lastMo, pct: b ? Math.round((a - b) / b * 100) : null } : null;
}
function soByOpp(rows) {
  const m = {};
  rows.forEach(r => { const k = r.opp || r.on; const o = m[k] || (m[k] = { opp: r.opp, name: r.on, uf: r.uf, prj: 0, svc: 0, tot: 0, orders: new Set(), last: null, open: 0 });
    if (r.svc) o.svc += r.amt; else o.prj += r.amt; o.tot += r.amt; if (r.ord) o.orders.add(r.ord); if (r.d && (!o.last || r.d > o.last)) o.last = r.d; if (r.st === 'open') o.open += r.amt; });
  return Object.values(m).map(o => Object.assign(o, { n: o.orders.size })).sort((a, b) => b.tot - a.tot);
}
function soByUF(rows) {
  const m = {};
  rows.forEach(r => { const k = r.uf || '?'; const o = m[k] || (m[k] = { uf: k, prj: 0, svc: 0, tot: 0, opps: new Set() }); if (r.svc) o.svc += r.amt; else o.prj += r.amt; o.tot += r.amt; o.opps.add(r.opp || r.on); });
  return Object.values(m).map(o => Object.assign(o, { n: o.opps.size })).sort((a, b) => b.tot - a.tot);
}
const soSumBy = (rows, f, n) => Object.entries(rows.reduce((m, r) => { const k = f(r); if (k) m[k] = (m[k] || 0) + r.amt; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, n || 10);
/* sell-out por Major Project ganho (mesmo código: Opportunity No. = Project Code) */
function soMajorMap(db) {
  const g = {}; (db.sellout || []).forEach(r => { if (r.opp) g[r.opp] = (g[r.opp] || 0) + r.amt; });
  const m = {}; (db.major || []).filter(x => /^win$/i.test(x.status || '')).forEach(x => { m[x.code] = { name: x.name, value: x.amt10k != null ? x.amt10k * 1e4 : null, so: g[x.code] || 0 }; });
  return m;
}

/* ---------- aba ---------- */
let SO_UF = '';           // estado escolhido no mapa/ranking (filtra a tabela de oportunidades)
const SO_TIERS = [[5e6, .9], [1e6, .72], [3e5, .55], [5e4, .38], [-Infinity, .22]];   // mesmas faixas do mapa original: ≥5M, 1–5M, 300K–1M, 50K–300K, <50K
function soFiltered() {
  const Y = $('#soY').value, R = $('#soR').value, T = $('#soT').value, A = $('#soA').value;
  return DB.sellout.filter(r => (!Y || r.y === +Y) && (!R || r.rep === R) && (!T || (T === 'svc' ? r.svc : !r.svc)) && (!A || r.at === A));
}
function setupSo() {
  const has = !!(DB.sellout && DB.sellout.length);
  $('nav.tabs button[data-v=so]').hidden = !has; if (!has) return;
  const keep = id => $(id).value, set = (id, opts, def) => { const k = keep(id); $(id).length = 1; opts.forEach(([v, l]) => $(id).insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(l)}</option>`)); $(id).value = [...$(id).options].some(o => o.value === k) && k ? k : (def || ''); };
  const ys = soYears(DB.sellout);
  set('#soY', ys.map(y => [y, y]), BOUND ? undefined : String(ys[0]));
  set('#soR', soSumBy(DB.sellout, r => r.rep, 99).map(([k]) => [k, k]));
  set('#soA', soSumBy(DB.sellout, r => r.at, 9).map(([k]) => [k, k]));
  if (BOUND) return;
  ['#soY', '#soR', '#soT', '#soA'].forEach(x => $(x).addEventListener('change', renderSo));
  $('#soRank').addEventListener('click', e => { const li = e.target.closest('[data-uf]'); if (!li) return; SO_UF = SO_UF === li.dataset.uf ? '' : li.dataset.uf; renderSoTable(); renderSoRank(); soZoom(); });
  $('#soUfClear').addEventListener('click', () => { SO_UF = ''; renderSoTable(); renderSoRank(); });
  $('#tSo tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-k]'); if (!tr) return; const nx = tr.nextElementSibling; if (nx && nx.classList.contains('exp')) { nx.remove(); return; }
    tr.insertAdjacentHTML('afterend', `<tr class="exp"><td colspan="8">${soOrdersHtml(tr.dataset.k)}</td></tr>`); });
}
let SO_ROWS = [];
function renderSo() {
  if (!DB.sellout || !DB.sellout.length) return;
  const ML = LB().MES, Yv = $('#soY').value, Y = +Yv || soYears(DB.sellout)[0];
  const rows = soFiltered(); SO_ROWS = rows;
  const tot = rows.reduce((a, r) => a + r.amt, 0), svc = rows.filter(r => r.svc).reduce((a, r) => a + r.amt, 0), open = rows.filter(r => r.st === 'open'), openV = open.reduce((a, r) => a + r.amt, 0);
  const opps = new Set(rows.map(r => r.opp || r.on)).size, ords = new Set(rows.map(r => r.ord).filter(Boolean)).size;
  const base = DB.sellout.filter(r => (!$('#soR').value || r.rep === $('#soR').value) && (!$('#soT').value || ($('#soT').value === 'svc' ? r.svc : !r.svc)) && (!$('#soA').value || r.at === $('#soA').value));
  const ytd = Yv ? soYtd(base, Y) : null;
  const ref = LOAD && LOAD.files ? lastFileDate(LOAD.files) : new Date(), old = open.filter(r => r.d && daysBetween(ref, toDate(r.d)) > 60).reduce((a, r) => a + r.amt, 0);
  $('#soKpis').innerHTML = [
    [usd(tot), t('soK1', { y: Yv || t('soAllYears') }), t('soK1d', { p: usd(tot - svc), s: usd(svc) })],
    [fmt(opps), t('soK2'), t('soK2d', { n: fmt(ords) })],
    [usd(openV), t('soK3'), old ? `<span class="pill md">${t('soK3d', { v: usd(old) })}</span>` : ''],
    ytd && ytd.pct != null ? [(ytd.pct > 0 ? '+' : '') + ytd.pct + '%', t('soK4', { m1: ML[0], m2: ML[ytd.lastMo - 1], py: Y - 1 }), t('soK4d', { a: usd(ytd.a), b: usd(ytd.b) })] : ['–', t('soK4n'), '']
  ].map(([n, l, d]) => `<div class="panel kpi"><div class="n">${n}</div><div class="l">${l}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`).join('');

  /* mês a mês: projeto + serviço do ano escolhido, linha do ano anterior */
  const mos = []; for (let m = 1; m <= 12; m++) mos.push(m);
  const yr = Yv ? rows : rows.filter(r => r.y === Y), prev = base.filter(r => r.y === Y - 1);
  const by = (arr, m, f) => arr.filter(r => r.mo === m && f(r)).reduce((a, r) => a + r.amt, 0);
  const lastMo = Math.max(0, ...yr.map(r => r.mo || 0)), M = mos.filter(m => m <= Math.max(lastMo, prev.length ? 12 : lastMo));
  chart('cSoM', { type: 'bar', data: { labels: M.map(m => ML[m - 1]), datasets: [
      { type: 'bar', label: t('soPrj'), data: M.map(m => m <= lastMo ? by(yr, m, r => !r.svc) : null), backgroundColor: css('--s1'), stack: 's' },
      { type: 'bar', label: t('soSvc'), data: M.map(m => m <= lastMo ? by(yr, m, r => r.svc) : null), backgroundColor: css('--s2'), stack: 's' },
      ...(prev.length ? [{ type: 'line', label: String(Y - 1), data: M.map(m => by(prev, m, () => true)), borderColor: css('--s4'), backgroundColor: css('--s4'), borderDash: [5, 4], pointRadius: 2, tension: .25 }] : [])] },
    options: baseOpts({ plugins: { vl: { off: true }, legend: { labels: { color: css('--muted'), boxWidth: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${usd(c.raw)}` } } },
      scales: { x: { stacked: true, ticks: { color: css('--muted') }, grid: { display: false } }, y: { stacked: true, ticks: { color: css('--muted'), callback: v => v < 0 ? '−' + usd(-v) : usd(v) }, grid: { color: css('--line') } } } }) });
  $('#soMSub').textContent = `${Y}${prev.length ? ' × ' + (Y - 1) : ''}`;

  const hbar = (id, pairs, color) => chart(id, { type: 'bar', data: { labels: pairs.map(p => trunc0(p[0], 20)), datasets: [{ label: 'USD', data: pairs.map(p => p[1]), backgroundColor: css(color) }] },
    options: baseOpts({ indexAxis: 'y', layout: { padding: { top: 8, right: 72 } }, plugins: { legend: { display: false }, vl: { money: true }, tooltip: { callbacks: { title: it => pairs[it[0].dataIndex][0], label: c => usd(c.raw) } } },
      scales: { x: { ticks: { color: css('--muted'), maxRotation: 0, maxTicksLimit: 4, callback: v => usdShort(v) }, grid: { color: css('--line') } }, y: { afterFit: sc => { sc.width = Math.max(sc.width, 160); }, ticks: { color: css('--muted'), font: { size: 11 } }, grid: { display: false } } } }) });
  hbar('cSoPl', soSumBy(rows, r => r.pl, 10), '--s1');
  hbar('cSoAcc', soSumBy(rows, r => r.acc, 10), '--s3');
  hbar('cSoRep', soSumBy(rows, r => r.rep, 10), '--s4');
  renderSoRank(); renderSoMap(); renderSoTable();
}
/* ranking por estado: barra com projeto e serviço, como no mapa original */
function renderSoRank() {
  const st = soByUF(SO_ROWS), known = st.filter(s => s.uf !== '?'), unk = st.find(s => s.uf === '?'), max = Math.max(1, ...known.map(s => s.tot));
  const li = s => `<li data-uf="${s.uf}" class="${SO_UF === s.uf ? 'on' : ''}"><b>${s.uf === '?' ? '–' : s.uf}</b><span class="nm">${esc(s.uf === '?' ? t('soNoUf') : (UF_NAME[s.uf] || s.uf))}<em>${t(s.n === 1 ? 'soOpp1' : 'soOppN', { n: s.n })}</em></span>
    <span class="bar2"><i style="width:${Math.max(0, s.prj) / max * 100}%;background:var(--s1)"></i><i style="width:${Math.max(0, s.svc) / max * 100}%;background:var(--s2)"></i></span><em class="v">${usd(s.tot)}</em></li>`;
  $('#soRank').innerHTML = known.slice(0, 12).map(li).join('') + (unk ? li(unk) : '');
  $('#soRankNote').textContent = known.length > 12 ? t('mapMore', { n: known.length - 12 }) : '';
}
/* mapa (Leaflet + contornos dos estados, como o mapa de RMA) */
let SOMAP = null, SOLAYER = null, SOTILES = null, SOTHEME = '', SOLBL = null;
function renderSoMap() {
  if (typeof window.L === 'undefined' || !window.L.map) { $('#soMapBox').hidden = true; return; }
  const LL = window.L;
  if (!SOMAP) { SOMAP = LL.map('soMap', { zoomSnap: 0.25, scrollWheelZoom: false }).setView([-14.5, -52], 4); SOMAP.attributionControl.setPrefix(false); }
  const theme = isDark() ? 'dark' : 'light';
  if (theme !== SOTHEME) { if (SOTILES) SOMAP.removeLayer(SOTILES);
    SOTILES = LL.tileLayer(`https://{s}.basemaps.cartocdn.com/${theme === 'dark' ? 'dark_nolabels' : 'light_nolabels'}/{z}/{x}/{y}{r}.png` + (CFG.cartoKey ? '?key=' + encodeURIComponent(CFG.cartoKey) : ''),
      { subdomains: 'abcd', maxZoom: 10, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>' }).addTo(SOMAP);
    SOTHEME = theme; }
  setTimeout(() => SOMAP.invalidateSize(), 0);
  loadGeo().then(geo => {
    const by = {}; soByUF(SO_ROWS).forEach(s => by[s.uf] = s);
    const blue = css('--s1'), line = css('--panel'), none = css('--line');
    const op = v => SO_TIERS.find(x => v >= x[0])[1];
    if (SOLAYER) SOMAP.removeLayer(SOLAYER);
    SOLAYER = LL.geoJSON(geo, { style: f => { const s = by[f.properties.sigla]; return { color: line, weight: 1, fillColor: s && s.tot > 0 ? blue : none, fillOpacity: s && s.tot > 0 ? op(s.tot) : .35 }; },
      onEachFeature: (f, l) => { const u = f.properties.sigla, s = by[u];
        l.bindTooltip(`<div class="maptip"><b>${u} – ${esc(UF_NAME[u] || f.properties.name)}</b><br>${s ? `${t('soTipTot', { v: usd(s.tot) })}<br>${t('soPrj')} ${usd(s.prj)} · ${t('soSvc')} ${usd(s.svc)}<br>${t(s.n === 1 ? 'soOpp1' : 'soOppN', { n: s.n })}` : t('soTipNone')}</div>`, { sticky: true });
        l.on({ mouseover: e => e.target.setStyle({ weight: 2.5, color: css('--ink') }), mouseout: e => SOLAYER.resetStyle(e.target), click: () => { if (by[u]) { SO_UF = u; renderSoTable(); renderSoRank(); } } }); } }).addTo(SOMAP);
    if (!SOMAP._fitted) { SOMAP.fitBounds(SOLAYER.getBounds(), { padding: [8, 8] }); SOMAP._fitted = true; }
    if (SOLBL) SOMAP.removeLayer(SOLBL);
    SOLBL = LL.layerGroup(Object.values(by).filter(s => s.uf !== '?' && UF_LBL[s.uf] && s.tot >= 5e4).map(s => LL.marker(UF_LBL[s.uf], { interactive: false, keyboard: false,
      icon: LL.divIcon({ className: 'uflbl', html: usdShort(s.tot), iconSize: [56, 16], iconAnchor: [28, 8] }) }))).addTo(SOMAP);
    $('#soLegend').innerHTML = `<span>${t('soScale')}</span>` + [['≥ 5M', .9], ['1–5M', .72], ['300K–1M', .55], ['50K–300K', .38], ['< 50K', .22]].map(([l, o]) => `<i style="background:${blue};opacity:${o}"></i><span>${l}</span>`).join('');
  }).catch(() => { $('#soMapBox').hidden = true; });
}
const usdShort = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toLocaleString(LOC(), { maximumFractionDigits: 1 }) + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : fmt(v); };
function soZoom() { if (!SOMAP || !SOLAYER || !SO_UF || SO_UF === '?') return; SOLAYER.eachLayer(l => { if (l.feature.properties.sigla === SO_UF) SOMAP.fitBounds(l.getBounds(), { maxZoom: 6 }); }); }
/* oportunidades: total, projeto, serviço, pedidos e, para Major Projects ganhos, quanto do valor já virou sell-out */
function renderSoTable() {
  const MJ = soMajorMap(DB), list = soByOpp(SO_ROWS).filter(o => !SO_UF || (o.uf || '?') === SO_UF);
  $('#soUfChip').hidden = !SO_UF; $('#soUfName').textContent = SO_UF ? (SO_UF === '?' ? t('soNoUf') : `${SO_UF} – ${UF_NAME[SO_UF] || ''}`) : '';
  paged('tSo', list.map(o => { const mj = o.opp && MJ[o.opp];
    return `<tr data-k="${esc(o.opp || o.name)}" style="cursor:pointer"><td>${esc(trunc0(o.name, 70))}${mj ? `<span class="pill tag">Major</span>` : ''}<br><span style="color:var(--muted);font-size:12px">${esc(o.opp || '')}</span></td><td>${o.uf || '–'}</td>
      <td class="num">${usd(o.prj)}</td><td class="num">${o.svc ? usd(o.svc) : '–'}</td><td class="num"><strong>${usd(o.tot)}</strong></td><td class="num">${fmt(o.n)}</td><td>${fdate(o.last)}</td>
      <td class="num">${mj && mj.value ? `${Math.round(mj.so / mj.value * 100)}% <span style="color:var(--muted);font-size:12px">${t('soOf', { v: usd(mj.value) })}</span>` : '–'}</td></tr>`; }),
    `<tr><td colspan="8">${t('soNoOpp')}</td></tr>`);
  $('#soCount').textContent = t('soCount', { n: fmt(list.length), v: usd(list.reduce((a, o) => a + o.tot, 0)) });
}
/* pedidos da oportunidade, do mais recente para o mais antigo */
function soOrdersHtml(k) {
  const lines = SO_ROWS.filter(r => (r.opp || r.on) === k), by = {};
  lines.forEach(r => { const o = by[r.ord] || (by[r.ord] = { ord: r.ord, d: r.d, acc: r.acc, svc: r.svc, amt: 0, st: {} }); o.amt += r.amt; o.st[r.st] = (o.st[r.st] || 0) + 1; if (r.d && (!o.d || r.d < o.d)) o.d = r.d; });
  const ST = { done: t('soStDone'), open: t('soStOpen'), cancel: t('soStCancel') };
  const ords = Object.values(by).sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')));
  return `<div class="hist"><table class="mini"><thead><tr><th>${t('soOrder')}</th><th>${t('soDate')}</th><th>${t('cCustomer')}</th><th>${t('cType')}</th><th>Status</th><th class="num">USD</th></tr></thead><tbody>${ords.slice(0, 30).map(o => {
    const sts = Object.keys(o.st).filter(s => !(s === 'cancel' && Object.keys(o.st).length > 1)).map(s => ST[s]).join(' / ');
    return `<tr><td>${esc(o.ord || '–')}</td><td>${fdate(o.d)}</td><td>${esc(trunc0(o.acc, 40))}</td><td>${o.svc ? t('soSvc') : t('soPrj')}</td><td>${esc(sts)}</td><td class="num">${usd(o.amt)}</td></tr>`; }).join('')}</tbody></table>${ords.length > 30 ? `<p class="count">${t('rpMore', { n: ords.length - 30 })}</p>` : ''}</div>`;
}
