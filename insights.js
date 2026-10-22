/* ===== Análise automática dos dados ("insights") =====
   Gera, a partir das planilhas, o resumo da semana, os destaques, os alertas, os próximos passos,
   a carteira por PM e os riscos dos Major Projects. Nada vem do PPT: tudo é calculado a cada leitura.
   São regras fixas e transparentes (não é um modelo de linguagem): cada frase tem uma conta por trás,
   e os limites abaixo podem ser ajustados pelo escritório de projetos. */
const INS_CFG = {
  majorStaleDays: 30,     // Major Project sem atualização há mais de N dias vira alerta
  fupStaleDays: 14,       // item em aberto no RAT sem follow-up há mais de N dias
  itrOldDays: 60,         // ITR em andamento há mais de N dias
  ticketOldWeeks: 4,      // ticket de engenharia aberto há mais de N semanas
  backlogOldYears: 2,     // projeto de backlog importado há N anos ou mais
  maxAlerts: 6, maxHighlights: 6
};

const INS_TXT = {
  pt: {
    summary: 'Semana {w}: {created} projetos importados em {y}, com {active} ativos ({tob} ToB e {tog} ToG) somando {val} em contratos. No suporte, {cc} contatos no call center no ano e {itr} ITRs locais de suporte técnico. Em RMA, {rma} casos no ano, {open} em aberto{old}.',
    summaryOld: ', {n} deles há mais de 30 dias',
    summarySo: ' Em sell-out de projetos, {v} em {y} ({n} oportunidades com pedido).',
    hSoUp: 'Sell-out de projetos de {m1} a {m2}: {a}, {p}% acima do mesmo período de {py} ({b}).',
    hSoDown: 'Sell-out de projetos de {m1} a {m2}: {a}, {p}% abaixo do mesmo período de {py} ({b}).',
    xSoDown: 'Revisar com o comercial o funil de pedidos de projeto para fechar a diferença de {v} contra {py}.',
    hSoConc: 'As 5 maiores oportunidades concentram {p}% do sell-out de {y} ({v}), a maior é {top}.',
    hSoUf: '{uf} lidera o sell-out de {y} com {v} ({p}% do valor com estado identificado).',
    aSoOpen: '{v} em pedidos de projeto aguardam embarque; {o} deles há mais de 60 dias, em {n} oportunidades.',
    xSoOpen: 'Cobrar a liberação dos pedidos parados há mais de 60 dias: {list}.',
    aSoMajor: '{n} Major Projects ganhos têm menos de 30% do valor em sell-out: {list}.',
    xSoMajor: 'Confirmar com os PMs o cronograma de pedidos de {list}.',
    hRmaDown: 'RMAs de {m1} a {m2}: {a}, {p}% abaixo do mesmo período de {py} ({b}).',
    hRmaUp: 'RMAs de {m1} a {m2}: {a}, {p}% acima do mesmo período de {py} ({b}).',
    hEng: 'Tickets de engenharia nas últimas 4 semanas: {a}, {d} em relação às 4 anteriores ({b}).',
    hCC: 'Call center em {m}: {a} contatos, {d} em relação a {pm} ({b}).',
    hMajor: 'Receita realizada nos {n} Major Projects ganhos: {inc}, {p}% do valor total de {val}.',
    hPipe: 'Pipeline: {n} oportunidades em andamento na lista de Major Projects ({b} em licitação).',
    hProd: '{cat} concentra {p}% das issues de engenharia das últimas 8 semanas ({n} de {t}).',
    hWeek: 'Desde a semana {pw}: {items}.',
    dItem: '{label} {a} → {b} ({d})',
    dActive: 'projetos ativos', dRmaOpen: 'RMAs em aberto', dRatOpen: 'riscos e issues em aberto', dItrOpen: 'ITRs em andamento',
    aRmaOld: '{n} dos {o} RMAs em aberto ({p}%) estão há mais de 30 dias; {sc} concentra {k} deles.',
    aRmaSlow: 'Tempo médio de reparo: {sc} leva {a} dias, contra {b} na {sc2}.',
    aMajorStale: '{n} de {t} Major Projects sem atualização há mais de {d} dias (último registro em {last}).',
    aRatOld: '{n} riscos e issues de importância alta em aberto há mais de 30 dias; {proj} tem {k} itens em aberto.',
    aFup: '{n} itens em aberto no RAT sem follow-up há mais de {d} dias (último em {last}).',
    aItrOld: '{n} ITRs em andamento há mais de {d} dias na HQ: {ids}.',
    aBacklog: '{n} projetos de backlog importados em {y} ou antes seguem sem conclusão.',
    aTickets: '{n} tickets de engenharia abertos há mais de {d} semanas: {list}.',
    aModel: 'O modelo {model} soma {n} RMAs em aberto, {p}% de todos os abertos.',
    xRmaOld: 'Revisar com a {sc} os {k} RMAs abertos há mais de 30 dias e acordar prazo de devolução.',
    xRmaSlow: 'Acompanhar o tempo de reparo da {sc} ({a} dias em média) e cobrar plano de redução.',
    xMajorStale: 'Atualizar andamento e próximos passos dos Major Projects: {list}.',
    xRatOld: 'Repassar o RAT com os responsáveis, começando por {proj}.',
    xFup: 'Registrar follow-up dos itens em aberto no RAT (último em {last}).',
    xItrOld: 'Escalar na HQ os ITRs mais antigos: {ids}.',
    xBacklog: 'Revisar os {n} projetos de backlog antigos: concluir, replanejar ou encerrar.',
    xTickets: 'Fechar ou atualizar os tickets abertos desde a semana {w}.',
    xModel: 'Investigar causa raiz do {model} com a HQ ({n} RMAs em aberto).',
    lvlHigh: 'Alto', lvlMed: 'Médio',
    pfMajor: '{n} Major Projects ({v})', pfMajor1: '1 Major Project ({v})', pfActive: '{n} contratos ativos ({v})', pfActive1: '1 contrato ativo ({v})', pfRat: '{n} itens no RAT', pfRat1: '1 item no RAT', pfRatHigh: '{n} alta',
    none: 'Nenhum ponto de atenção encontrado nos dados desta semana.',
    noActions: 'Sem ações sugeridas para esta semana.'
  },
  en: {
    summary: 'Week {w}: {created} projects imported in {y}, {active} of them active ({tob} ToB and {tog} ToG) with {val} in contracts. Support handled {cc} call center contacts this year and {itr} local technical support ITRs. RMA: {rma} cases this year, {open} open{old}.',
    summaryOld: ', {n} of them for more than 30 days',
    summarySo: ' Project sell-out reached {v} in {y} ({n} opportunities with orders).',
    hSoUp: 'Project sell-out from {m1} to {m2}: {a}, {p}% above the same period of {py} ({b}).',
    hSoDown: 'Project sell-out from {m1} to {m2}: {a}, {p}% below the same period of {py} ({b}).',
    xSoDown: 'Review the project order pipeline with sales to close the {v} gap against {py}.',
    hSoConc: 'The top 5 opportunities account for {p}% of {y} sell-out ({v}); the largest is {top}.',
    hSoUf: '{uf} leads {y} sell-out with {v} ({p}% of the value with an identified state).',
    aSoOpen: '{v} in project orders are awaiting shipment; {o} of it for more than 60 days, across {n} opportunities.',
    xSoOpen: 'Push for release of the orders held for more than 60 days: {list}.',
    aSoMajor: '{n} won Major Projects have less than 30% of their value in sell-out: {list}.',
    xSoMajor: 'Confirm the order schedule of {list} with the PMs.',
    hRmaDown: 'RMAs from {m1} to {m2}: {a}, {p}% below the same period of {py} ({b}).',
    hRmaUp: 'RMAs from {m1} to {m2}: {a}, {p}% above the same period of {py} ({b}).',
    hEng: 'Engineering tickets in the last 4 weeks: {a}, {d} versus the previous 4 ({b}).',
    hCC: 'Call center in {m}: {a} contacts, {d} versus {pm} ({b}).',
    hMajor: 'Income to date on the {n} won Major Projects: {inc}, {p}% of their total value of {val}.',
    hPipe: 'Pipeline: {n} open opportunities in the Major Projects list ({b} in bidding).',
    hProd: '{cat} accounts for {p}% of engineering issues in the last 8 weeks ({n} of {t}).',
    hWeek: 'Since week {pw}: {items}.',
    dItem: '{label} {a} → {b} ({d})',
    dActive: 'active projects', dRmaOpen: 'open RMAs', dRatOpen: 'open risks and issues', dItrOpen: 'ITRs in progress',
    aRmaOld: '{n} of the {o} open RMAs ({p}%) have been open for more than 30 days; {sc} holds {k} of them.',
    aRmaSlow: 'Average repair time: {sc} takes {a} days, versus {b} at {sc2}.',
    aMajorStale: '{n} of {t} Major Projects without an update for more than {d} days (latest entry on {last}).',
    aRatOld: '{n} high-importance risks and issues open for more than 30 days; {proj} has {k} open items.',
    aFup: '{n} open RAT items without a follow-up for more than {d} days (latest on {last}).',
    aItrOld: '{n} ITRs in progress at HQ for more than {d} days: {ids}.',
    aBacklog: '{n} backlog projects imported in {y} or earlier are still not completed.',
    aTickets: '{n} engineering tickets open for more than {d} weeks: {list}.',
    aModel: 'Model {model} has {n} open RMAs, {p}% of all open ones.',
    xRmaOld: 'Review with {sc} the {k} RMAs open for more than 30 days and agree on a return date.',
    xRmaSlow: 'Track {sc} repair time ({a} days on average) and ask for a reduction plan.',
    xMajorStale: 'Update progress and next steps for the Major Projects: {list}.',
    xRatOld: 'Go through the RAT with the owners, starting with {proj}.',
    xFup: 'Record a follow-up on the open RAT items (latest on {last}).',
    xItrOld: 'Escalate the oldest ITRs at HQ: {ids}.',
    xBacklog: 'Review the {n} old backlog projects: complete, replan or close them.',
    xTickets: 'Close or update the tickets open since week {w}.',
    xModel: 'Investigate the root cause of {model} with HQ ({n} open RMAs).',
    lvlHigh: 'High', lvlMed: 'Medium',
    pfMajor: '{n} Major Projects ({v})', pfMajor1: '1 Major Project ({v})', pfActive: '{n} active contracts ({v})', pfActive1: '1 active contract ({v})', pfRat: '{n} RAT items', pfRat1: '1 RAT item', pfRatHigh: '{n} high',
    none: 'No attention points found in this week\'s data.',
    noActions: 'No suggested actions this week.'
  }
};
function itx(k, v) { let s = (INS_TXT[LANG] && INS_TXT[LANG][k]) || INS_TXT.pt[k] || k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; }

const daysBetween = (a, b) => Math.round((a - b) / 864e5);
const toDate = s => { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? null : d; };
const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
const listNames = (arr, n) => arr.slice(0, n).join(', ') + (arr.length > n ? ' +' + (arr.length - n) : '');
const signed = (d, isPct) => (d > 0 ? '+' : d < 0 ? '−' : '') + (isPct ? Math.abs(d) + '%' : fmt(Math.abs(d)));

/* Métricas da semana: números que entram nas frases e que ficam salvos (metrics.json) para comparar semanas */
/* sell-out: ano mais recente da base, valor total, oportunidades e pedidos aguardando embarque */
function soMetrics(S, ref) {
  if (!S || !S.length || typeof soYears !== 'function') return {};
  const Y = soYears(S)[0], yr = S.filter(r => r.y === Y), open = yr.filter(r => r.st === 'open');   // mesmo recorte do painel (ano mais recente)
  return { soY: Y, soTotal: Math.round(yr.reduce((a, r) => a + r.amt, 0)), soOpps: new Set(yr.map(r => r.opp || r.on)).size,
    soOpen: Math.round(open.reduce((a, r) => a + r.amt, 0)), soOpenOld: Math.round(open.filter(r => r.d && daysBetween(ref, toDate(r.d)) > 60).reduce((a, r) => a + r.amt, 0)) };
}
function computeMetrics(db, ref) {
  const P = db.projects || [], years = [...new Set(P.map(p => p.yr).filter(Boolean))].sort((a, b) => b - a), Y = years[0] || ref.getFullYear();
  const active = P.filter(p => ACTIVE.includes(p.c));
  const rY = (db.rma || []).filter(r => r.y === Y), rOpen = rY.filter(r => r.st === 'Open');
  const itrRule = (db.itrs || []).filter(r => r.y === Y && r.type === 'Product Technical Support' && String(r.loc || '').trim().toLowerCase() === 'local');
  return {
    Y, created: P.filter(p => p.yr === Y).length, active: active.length,
    tob: active.filter(p => p.t === 'ToB').length, tog: active.filter(p => p.t === 'ToG').length,
    activeValue: active.reduce((a, p) => a + (p.amt || 0), 0),
    cc: (db.callCenter || []).filter(r => r.mes && +r.mes.slice(0, 4) === Y).reduce((a, r) => a + (r.tot || 0), 0),
    itr: itrRule.length, itrOpen: (db.itrs || []).filter(r => r.st && r.st !== 'Closed').length,
    rma: rY.length, rmaOpen: rOpen.length, rmaOld: rOpen.filter(r => r.dur === '> 30 dias').length,
    ratOpen: (db.risks || []).filter(r => r.st === 'Open').length,
    ...soMetrics(db.sellout, ref)
  };
}

/* Gera tudo o que aparece no resumo da Visão executiva e no relatório */
function buildInsights(db, ref, prev) {
  ref = ref || new Date();
  const M = computeMetrics(db, ref), Y = M.Y, ML = LB().MES, KEYS = LABELS.pt.MES, NAMES = LB();
  const weekNo = isoWeek(ref);
  const highlights = [], alerts = [], actions = [];
  const add = (lvl, score, text, action) => alerts.push({ lvl, score, text, action });

  /* ---- resumo ---- */
  const summary = itx('summary', { w: weekNo, created: fmt(M.created), y: Y, active: fmt(M.active), tob: fmt(M.tob), tog: fmt(M.tog), val: usd(M.activeValue),
    cc: fmt(M.cc), itr: fmt(M.itr), rma: fmt(M.rma), open: fmt(M.rmaOpen), old: M.rmaOld ? itx('summaryOld', { n: fmt(M.rmaOld) }) : '' })
    + (M.soY ? itx('summarySo', { v: usd(M.soTotal), y: M.soY, n: fmt(M.soOpps) }) : '');

  /* ---- comparação com a semana anterior (quando existe metrics.json salvo) ---- */
  if (prev && prev.metrics) {
    const p = prev.metrics, items = [];
    [['dActive', 'active'], ['dRmaOpen', 'rmaOpen'], ['dRatOpen', 'ratOpen'], ['dItrOpen', 'itrOpen']].forEach(([lbl, k]) => {
      if (p[k] != null && M[k] != null && p[k] !== M[k]) items.push(itx('dItem', { label: itx(lbl), a: fmt(p[k]), b: fmt(M[k]), d: signed(M[k] - p[k]) }));
    });
    if (items.length) highlights.push({ score: 100, text: itx('hWeek', { pw: +String(prev.week).slice(6) || prev.week, items: items.join('; ') }) });
  }

  /* ---- RMA: ano até o último mês fechado x mesmo período do ano anterior ---- */
  const R = db.rma || [];
  const lastFull = ref.getFullYear() === Y ? ref.getMonth() : 12;   // meses 1..lastFull já fechados
  if (lastFull >= 2) {
    const ms = KEYS.slice(0, lastFull), a = R.filter(r => r.y === Y && ms.includes(r.m)).length, b = R.filter(r => r.y === Y - 1 && ms.includes(r.m)).length;
    if (a && b) {
      const d = pctOf(a - b, b);
      if (d <= -5) highlights.push({ score: 90, text: itx('hRmaDown', { m1: ML[0], m2: ML[lastFull - 1], a: fmt(a), p: Math.abs(d), py: Y - 1, b: fmt(b) }) });
      else if (d >= 5) add('high', 85, itx('hRmaUp', { m1: ML[0], m2: ML[lastFull - 1], a: fmt(a), p: d, py: Y - 1, b: fmt(b) }), null);
    }
  }
  const rY = R.filter(r => r.y === Y), rOpen = rY.filter(r => r.st === 'Open'), rOld = rOpen.filter(r => r.dur === '> 30 dias');
  if (rOld.length) {
    const bySc = Object.entries(count(rOld, r => r.sc)).sort((a, b) => b[1] - a[1]), sc = bySc[0][0].replace(' Service Center', ''), k = bySc[0][1], p = pctOf(rOld.length, rOpen.length);
    add(p >= 50 ? 'high' : 'med', 80 + p / 10, itx('aRmaOld', { n: fmt(rOld.length), o: fmt(rOpen.length), p, sc, k: fmt(k) }), itx('xRmaOld', { sc, k: fmt(k) }));
  }
  const closed = rY.filter(r => r.st === 'Closed' && r.d != null), bySc = {};
  closed.forEach(r => { const o = bySc[r.sc] || (bySc[r.sc] = { n: 0, s: 0 }); o.n++; o.s += r.d; });
  const avg = Object.entries(bySc).filter(([, o]) => o.n >= 30).map(([sc, o]) => [sc.replace(' Service Center', ''), o.s / o.n]).sort((a, b) => b[1] - a[1]);
  if (avg.length >= 2 && avg[0][1] >= 1.5 * avg[avg.length - 1][1]) {
    const [s1, a1] = avg[0], [s2, a2] = avg[avg.length - 1];
    add('med', 60, itx('aRmaSlow', { sc: s1, a: fmt(a1), b: fmt(a2), sc2: s2 }), itx('xRmaSlow', { sc: s1, a: fmt(a1) }));
  }
  if (rOpen.length >= 20) {
    const top = Object.entries(count(rOpen, r => r.model)).sort((a, b) => b[1] - a[1])[0];
    if (top && pctOf(top[1], rOpen.length) >= 12) add('med', 45, itx('aModel', { model: top[0], n: fmt(top[1]), p: pctOf(top[1], rOpen.length) }), itx('xModel', { model: top[0], n: fmt(top[1]) }));
  }

  /* ---- suporte ---- */
  const S = (db.support || []).filter(s => s.yr === Y), maxW = Math.max(0, ...S.map(s => s.wo || 0));
  if (maxW >= 8) {
    const a = S.filter(s => s.wo > maxW - 4).length, b = S.filter(s => s.wo > maxW - 8 && s.wo <= maxW - 4).length;
    if (b) { const d = pctOf(a - b, b); if (Math.abs(d) >= 10) highlights.push({ score: 70, text: itx('hEng', { a: fmt(a), b: fmt(b), d: signed(d, true) }) }); }
    const per = S.filter(s => s.wo > maxW - 8), top = Object.entries(count(per, s => s.cat || '(Not specified)')).sort((x, y) => y[1] - x[1])[0];
    if (top && per.length >= 10 && pctOf(top[1], per.length) >= 30) highlights.push({ score: 50, text: itx('hProd', { cat: top[0], p: pctOf(top[1], per.length), n: fmt(top[1]), t: fmt(per.length) }) });
  }
  const oldT = S.filter(s => s.st !== 'Closed' && s.wo && maxW - s.wo >= INS_CFG.ticketOldWeeks).sort((a, b) => a.wo - b.wo);
  if (oldT.length) add('med', 50, itx('aTickets', { n: fmt(oldT.length), d: INS_CFG.ticketOldWeeks, list: listNames(oldT.map(s => `${s.cust} (${t('wkPrefix')}${s.wo})`), 3) }), itx('xTickets', { w: oldT[0].wo }));
  const cc = (db.callCenter || []).filter(r => r.mes && +r.mes.slice(0, 4) === Y && !(+r.mes.slice(0, 4) === ref.getFullYear() && +r.mes.slice(5, 7) === ref.getMonth() + 1));
  if (cc.length >= 2) {
    const a = cc[cc.length - 1], b = cc[cc.length - 2], d = pctOf((a.tot || 0) - (b.tot || 0), b.tot || 0);
    highlights.push({ score: Math.abs(d) >= 10 ? 65 : 30, text: itx('hCC', { m: ML[+a.mes.slice(5, 7) - 1], a: fmt(a.tot), d: signed(d, true), pm: ML[+b.mes.slice(5, 7) - 1], b: fmt(b.tot) }) });
  }
  const itrOld = (db.itrs || []).filter(r => r.st && r.st !== 'Closed' && (r.age || 0) > INS_CFG.itrOldDays).sort((a, b) => b.age - a.age);
  if (itrOld.length) add(itrOld.length >= 3 ? 'high' : 'med', 70, itx('aItrOld', { n: fmt(itrOld.length), d: INS_CFG.itrOldDays, ids: listNames(itrOld.map(r => `${r.id} (${fmt(r.age)}d)`), 3) }), itx('xItrOld', { ids: listNames(itrOld.map(r => r.id), 3) }));

  /* ---- projetos ---- */
  const P = db.projects || [];
  const oldBk = P.filter(p => p.c === 'Project Backlog' && p.yr && p.yr <= Y - INS_CFG.backlogOldYears);
  if (oldBk.length) add('med', 40, itx('aBacklog', { n: fmt(oldBk.length), y: Y - INS_CFG.backlogOldYears }), itx('xBacklog', { n: fmt(oldBk.length) }));
  const majors = db.major ? (db.major || []).filter(m => /^win$/i.test(m.status || '')) : [];
  if (majors.length) {
    const inc = majors.reduce((a, m) => a + (m.inc || 0), 0), val = majors.reduce((a, m) => a + (m.amt10k || 0) * 1e4, 0);
    if (val) highlights.push({ score: 55, text: itx('hMajor', { n: majors.length, inc: usd(inc), p: pctOf(inc, val), val: usd(val) }) });
    const stale = majors.map(m => ({ m, d: toDate(m.progDate) })).filter(x => !x.d || daysBetween(ref, x.d) > INS_CFG.majorStaleDays);
    if (stale.length) {
      const last = majors.map(m => toDate(m.progDate)).filter(Boolean).sort((a, b) => b - a)[0];
      const names = stale.sort((a, b) => (a.d || 0) - (b.d || 0)).map(x => trunc0(x.m.name, 28));
      add(stale.length >= majors.length / 2 ? 'high' : 'med', 75, itx('aMajorStale', { n: stale.length, t: majors.length, d: INS_CFG.majorStaleDays, last: last ? fdate(last.toISOString()) : '–' }), itx('xMajorStale', { list: listNames(names, 3) }));
    }
    const pipe = db.major.filter(m => !/^win$/i.test(m.status || '') && /ongoing|pending/i.test(m.status || ''));
    if (pipe.length) highlights.push({ score: 35, text: itx('hPipe', { n: pipe.length, b: pipe.filter(m => /bidding/i.test(m.stage || '')).length }) });
  }

  /* ---- Project SellOut ---- */
  let sellout = null;
  const SO = db.sellout || [];
  if (SO.length && M.soY) {
    const sy = M.soY, yr = SO.filter(r => r.y === sy), ytd = soYtd(SO, sy);
    if (ytd && ytd.b && ytd.pct != null) {
      const a = { m1: ML[0], m2: ML[ytd.lastMo - 1], a: usd(ytd.a), p: Math.abs(ytd.pct), py: sy - 1, b: usd(ytd.b) };
      if (ytd.pct >= 5) highlights.push({ score: 88, text: itx('hSoUp', a) });
      else if (ytd.pct <= -5) add(ytd.pct <= -15 ? 'high' : 'med', 72, itx('hSoDown', a), itx('xSoDown', { v: usd(ytd.b - ytd.a), py: sy - 1 }));
    }
    const opps = soByOpp(yr), tot = M.soTotal;
    if (opps.length >= 8 && tot > 0) { const t5 = opps.slice(0, 5).reduce((a, o) => a + o.tot, 0), p = pctOf(t5, tot);
      if (p >= 30) highlights.push({ score: 48, text: itx('hSoConc', { p, y: sy, v: usd(t5), top: `${trunc0(opps[0].name, 40)} (${usd(opps[0].tot)})` }) }); }
    const ufs = soByUF(yr).filter(u => u.uf !== '?'), known = ufs.reduce((a, u) => a + u.tot, 0);
    if (ufs.length >= 3 && known > 0) highlights.push({ score: 40, text: itx('hSoUf', { uf: `${ufs[0].uf} (${UF_NAME[ufs[0].uf] || ufs[0].uf})`, y: sy, v: usd(ufs[0].tot), p: pctOf(ufs[0].tot, known) }) });
    if (M.soOpenOld >= 100000) {
      const old = soByOpp(yr.filter(r => r.st === 'open' && r.d && daysBetween(ref, toDate(r.d)) > 60));
      add(M.soOpenOld >= 1e6 ? 'high' : 'med', 66, itx('aSoOpen', { v: usd(M.soOpen), o: usd(M.soOpenOld), n: fmt(old.length) }),
        itx('xSoOpen', { list: listNames(old.map(o => `${trunc0(o.name, 32)} (${usd(o.tot)})`), 3) }));
    }
    const mj = Object.values(soMajorMap(db)).filter(m => m.value > 0).map(m => Object.assign(m, { pct: pctOf(m.so, m.value) })).sort((a, b) => b.value - a.value);
    const low = mj.filter(m => m.pct < 30);
    if (low.length) add('med', 52, itx('aSoMajor', { n: low.length, list: listNames(low.map(m => `${trunc0(m.name, 28)} (${m.pct}%)`), 3) }), itx('xSoMajor', { list: listNames(low.map(m => trunc0(m.name, 28)), 3) }));
    /* resumo para o relatório (fica no snapshot da semana, sem as linhas) */
    const by = (arr, m) => Math.round(arr.filter(r => r.mo === m).reduce((a, r) => a + r.amt, 0));
    const prevY = SO.filter(r => r.y === sy - 1), months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    sellout = { y: sy, total: tot, prj: Math.round(yr.filter(r => !r.svc).reduce((a, r) => a + r.amt, 0)), svc: Math.round(yr.filter(r => r.svc).reduce((a, r) => a + r.amt, 0)),
      opps: M.soOpps, open: M.soOpen, openOld: M.soOpenOld, ytd,
      months: months.map(m => by(yr, m)), prev: prevY.length ? months.map(m => by(prevY, m)) : null, lastMo: Math.max(0, ...yr.map(r => r.mo || 0)),
      ufs: ufs.slice(0, 8).map(u => [u.uf, Math.round(u.tot)]), noUf: Math.round((soByUF(yr).find(u => u.uf === '?') || { tot: 0 }).tot),
      top: opps.slice(0, 8).map(o => [trunc0(o.name, 60), o.uf || '–', Math.round(o.tot)]),
      majors: mj.slice(0, 8).map(m => [trunc0(m.name, 40), Math.round(m.value), Math.round(m.so), m.pct]) };
  }

  /* ---- riscos (RAT) ---- */
  const rOpenRat = (db.risks || []).filter(r => r.st === 'Open' && r.title);
  const highOld = rOpenRat.filter(r => r.imp === 'High' && r.ag === '> 30 days');
  if (highOld.length) {
    const top = Object.entries(count(rOpenRat, r => r.project ? String(r.project).trim() : null)).sort((a, b) => b[1] - a[1])[0];
    add('high', 78, itx('aRatOld', { n: fmt(highOld.length), proj: top[0], k: top[1] }), itx('xRatOld', { proj: top[0] }));
  }
  const fups = rOpenRat.map(r => toDate(r.fup)).filter(Boolean);
  const staleF = rOpenRat.filter(r => { const d = toDate(r.fup); return !d || daysBetween(ref, d) > INS_CFG.fupStaleDays; });
  if (staleF.length && staleF.length >= rOpenRat.length / 3) {
    const last = fups.sort((a, b) => b - a)[0];
    add('med', 55, itx('aFup', { n: fmt(staleF.length), d: INS_CFG.fupStaleDays, last: last ? fdate(last.toISOString()) : '–' }), itx('xFup', { last: last ? fdate(last.toISOString()) : '–' }));
  }

  /* ---- carteira por PM (Major Projects + contratos ativos + RAT), juntando pelo primeiro nome ---- */
  const pf = {};
  const NOT_PERSON = /legal|dispute|tbd|to be|n\/a|^-+$/i;
  const slot = (name) => { if (!name || NOT_PERSON.test(String(name))) return null; const k = personKey(name); if (!k) return null; return pf[k] || (pf[k] = { key: k, name: cleanName(name), mj: 0, mjv: 0, ac: 0, acv: 0, rat: 0, ratH: 0 }); };
  majors.forEach(m => { const o = slot(m.pm); if (o) { o.name = cleanName(m.pm); o.mj++; o.mjv += (m.amt10k || 0) * 1e4; } });
  P.filter(p => ACTIVE.includes(p.c)).forEach(p => { const o = slot(p.pm || p.pm2); if (o) { o.ac++; o.acv += p.amt || 0; } });
  rOpenRat.forEach(r => { const o = pf[personKey(r.owner)]; if (o) { o.rat++; if (r.imp === 'High') o.ratH++; } });
  const portfolio = Object.values(pf).filter(o => o.mj || o.ac >= 2 || o.rat).sort((a, b) => (b.mjv + b.acv) - (a.mjv + a.acv));

  /* ---- riscos registrados nos Major Projects ganhos ---- */
  const majorRisks = majors.map(m => {
    const items = String(m.risk || '').split(/\n?\s*\d+\.\s*Open Risk:\s*/i).map(x => x.replace(/-[^-()]+\(\d+\)\s*$/, '').trim()).filter(x => x.length > 3);
    return { name: m.name, pm: cleanName(m.pm), upd: m.progDate, risks: [...new Set(items)] };
  }).filter(x => x.risks.length);

  alerts.sort((a, b) => b.score - a.score);
  highlights.sort((a, b) => b.score - a.score);
  const al = alerts.slice(0, INS_CFG.maxAlerts);
  return {
    week: weekNo, metrics: M, summary,
    highlights: highlights.slice(0, INS_CFG.maxHighlights).map(h => h.text),
    alerts: al.map(a => ({ level: a.lvl, text: a.text })),
    actions: al.filter(a => a.action).map(a => a.action),
    portfolio, majorRisks, sellout
  };
}
/* Linha da carteira por PM, com singular/plural */
function pfLine(o) {
  return [o.mj ? itx(o.mj === 1 ? 'pfMajor1' : 'pfMajor', { n: o.mj, v: usd(o.mjv) }) : null,
    o.ac ? itx(o.ac === 1 ? 'pfActive1' : 'pfActive', { n: o.ac, v: usd(o.acv) }) : null,
    o.rat ? itx(o.rat === 1 ? 'pfRat1' : 'pfRat', { n: o.rat }) + (o.ratH ? ` (${itx('pfRatHigh', { n: o.ratH })})` : '') : null].filter(Boolean).join(' · ');
}
const trunc0 = (v, n) => { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); return v.length > n ? v.slice(0, n - 1) + '…' : v; };
