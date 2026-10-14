/* ===== Exportar relatório semanal em PowerPoint (.pptx) =====
   Carregado sob demanda pelo botão "Exportar relatório", junto com a biblioteca PptxGenJS.
   Usa os mesmos dados que o painel acabou de ler (DB), a análise automática da semana (INS, de insights.js) e o idioma escolhido (LANG).
   Gráficos nativos do PowerPoint: dá pra editar valores, cores e títulos depois de abrir o arquivo. */
(function () {
  const W = 13.333, H = 7.5, M = 0.4;               // slide 16:9 (LAYOUT_WIDE), margem lateral
  const CW = W - 2 * M;                              // largura útil
  const COL = { navy: '0C2340', navy2: '0A1B30', bg: 'DCE6F2', accent: '8FB4E3', muted: '4A5F7A', line: 'D9E2EC',
                white: 'FFFFFF', red: 'C8102E', s1: '155F82', s2: 'E97132', s3: '196B24', s4: '0F9ED5', grey: '8A9BB0' };
  const FONT = 'Aptos';

  /* ---------- dados do relatório (mesmas regras do painel) ---------- */
  function collect() {
    const P = DB.projects, Y = projYears()[0];
    const byC = count(P, p => p.c);
    const active = P.filter(p => ACTIVE.includes(p.c));
    const levels = ['HQ Level', 'Regional Level', 'Local Level', 'Under classification'];
    const levelData = levels.map(l => ({ l, v: ['ToB', 'ToG'].map(tp => active.filter(p => p.t === tp && p.l === l).length) }));

    const ML = LB().MES;
    const cc = DB.callCenter.filter(r => r.mes && +r.mes.slice(0, 4) === Y);
    const SY = DB.support.filter(s => s.yr === Y);
    const maxW = Math.max(0, ...SY.map(s => s.wo || 0));
    const per = SY.filter(s => (s.wo || 0) > maxW - 8);
    const prod = Object.entries(count(per, s => s.cat || '(Not specified)')).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const I = DB.itrs || [];
    const iAll = I.filter(r => r.y === Y);
    const iRule = iAll.filter(r => r.type === 'Product Technical Support' && String(r.loc || '').trim().toLowerCase() === 'local');
    const lastMo = Math.max(0, ...iAll.map(r => r.mo || 0));
    const itrMonths = []; for (let m = 1; m <= lastMo; m++) itrMonths.push(m);

    const R = DB.rma, rY = R.filter(r => r.y === Y), rP = R.filter(r => r.y === Y - 1), rOpen = rY.filter(r => r.st === 'Open');
    const closed = rY.filter(r => r.st === 'Closed' && r.d != null);
    const scs = [...new Set(rY.map(r => r.sc))].sort((a, b) => rY.filter(r => r.sc === b).length - rY.filter(r => r.sc === a).length);
    const ufs = Object.entries(count(rY, r => r.uf ? String(r.uf).toUpperCase() : null)).sort((a, b) => b[1] - a[1]);

    const ratOpenHigh = DB.risks.filter(r => r.st === 'Open' && r.imp === 'High' && r.title)
      .sort((a, b) => (a.ag === '> 30 days' ? 0 : 1) - (b.ag === '> 30 days' ? 0 : 1));

    return { Y, byC, created: P.filter(p => p.yr === Y).length, activeN: active.length, levelData,
      cc, ccTot: cc.reduce((a, r) => a + (r.tot || 0), 0), ML,
      SY, withItr: SY.filter(s => s.itr).length, openT: SY.filter(s => s.st !== 'Closed'), maxW, prod,
      iRule, itrMonths, iOpenAll: iAll.filter(r => r.st && r.st !== 'Closed'),
      rY, rP, rOpen, old: rOpen.filter(r => r.dur === '> 30 dias').length,
      oow: rY.length ? Math.round(rY.filter(r => r.w === 'OOW').length / rY.length * 100) : null,
      avg: closed.length ? closed.reduce((a, r) => a + r.d, 0) / closed.length : null, scs, ufs,
      majors: (DB.major ? majorRows() : []).sort((a, b) => (b.amt || 0) - (a.amt || 0)),
      ratOpenHigh, ratOpen: DB.risks.filter(r => r.st === 'Open').length };
  }

  /* ---------- peças de layout ---------- */
  const card = (s, x, y, w, h, fill) => s.addShape('roundRect', { x, y, w, h, rectRadius: 0.12, fill: { color: fill || COL.white }, line: { color: fill || COL.white, width: 0 },
    shadow: { type: 'outer', color: '0C2340', opacity: 0.12, blur: 4, offset: 1, angle: 90 } });

  function kpis(s, items, y, h) {
    const gap = 0.2, w = (CW - gap * (items.length - 1)) / items.length;
    items.forEach(([label, value, note], i) => {
      const x = M + i * (w + gap);
      card(s, x, y, w, h);
      s.addText(String(label).toUpperCase(), { x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.4, isTextBox: true, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 10.5, bold: true, color: COL.navy, margin: 0 });
      s.addText(String(value), { x: x + 0.1, y: y + 0.45, w: w - 0.2, h: h - (note ? 0.85 : 0.55), isTextBox: true, align: 'center', valign: 'middle', fontFace: FONT, fontSize: note ? 26 : 28, bold: true, color: COL.navy, margin: 0 });
      if (note) s.addText(String(note), { x: x + 0.1, y: y + h - 0.38, w: w - 0.2, h: 0.3, isTextBox: true, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 9.5, color: COL.muted, margin: 0 });
    });
  }

  /* opções de gráfico sempre novas (o PptxGenJS altera o objeto de opções) */
  function chartOpts(x, y, w, h, title, extra) {
    return Object.assign({
      x, y, w, h, showTitle: true, title, titleFontFace: FONT, titleFontSize: 12, titleColor: COL.navy, titleBold: true,
      chartColors: [COL.s1, COL.s2, COL.s3, COL.s4],
      catAxisLabelColor: COL.muted, valAxisLabelColor: COL.muted, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
      valGridLine: { color: COL.line, size: 0.5 }, catGridLine: { style: 'none' },
      showValue: true, dataLabelFontSize: 8, dataLabelFontFace: FONT, dataLabelColor: COL.navy, dataLabelFormatCode: '#,##0',
      showLegend: true, legendPos: 'b', legendFontSize: 9, legendFontFace: FONT, legendColor: COL.muted
    }, extra || {});
  }

  function bullets(s, lines, x, y, w, h, color, size) {
    const arr = lines.filter(Boolean).map((l, i, a) => ({ text: String(l), options: { bullet: true, breakLine: i < a.length - 1, paraSpaceAfter: 4 } }));
    if (!arr.length) arr.push({ text: '–' });
    s.addText(arr, { x, y, w, h, isTextBox: true, valign: 'top', fontFace: FONT, fontSize: size || 10.5, color, margin: 0.05 });
  }

  function table(s, head, rows, x, y, w, colW, fontSize) {
    const hdr = head.map(hd => ({ text: hd, options: { bold: true, color: COL.white, fill: { color: COL.navy } } }));
    const body = rows.map((r, i) => r.map(c => ({ text: c == null ? '–' : String(c), options: { fill: { color: i % 2 ? 'F3F6FA' : COL.white } } })));
    s.addTable([hdr, ...body], { x, y, w, colW, fontFace: FONT, fontSize: fontSize || 9.5, color: COL.navy, valign: 'middle',
      border: { type: 'solid', pt: 0.5, color: COL.line }, margin: 0.04, autoPage: false });
  }

  const trunc = (v, n) => { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); return v.length > n ? v.slice(0, n - 1) + '…' : v; };

  async function logoData() {
    const r = await fetch('logo-dahua-white.png'); const b = await r.blob();
    const d = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(b); });
    return d.replace(/^data:/, '');   // o PptxGenJS espera "image/png;base64,..."
  }

  /* ---------- montagem ---------- */
  /* opt.week / opt.date: semana e data dos dados (semana salva). Sem opt, usa os dados atuais. */
  window.buildReport = async function (opt) {
    opt = opt || {};
    const D = collect(), now = new Date(), ref = opt.date || (LOAD && LOAD.files ? lastFileDate(LOAD.files) : now), wk = opt.week || isoWeek(ref);
    const dt = ref.toLocaleDateString(LOC(), LANG === 'pt' ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
    const { CLS, LVL } = LB();
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.title = t('rpTitle') + ' – ' + t('rpWeek', { w: wk });
    pres.author = 'Brazil Delivery Management System';
    pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

    const logo = await logoData();
    pres.defineSlideMaster({
      title: 'BDMS', background: { color: COL.bg },
      objects: [
        { rect: { x: 0, y: 0, w: W, h: 0.85, fill: { color: COL.navy } } },
        { image: { x: M, y: 0.2, w: 1.51, h: 0.45, data: logo } },
        { line: { x: 2.1, y: 0.22, w: 0, h: 0.42, line: { color: '2B4A70', width: 1 } } },
        { text: { text: t('rpWeek', { w: wk }) + ' · ' + dt, options: { x: W - M - 3.6, y: 0.2, w: 3.6, h: 0.45, align: 'right', valign: 'middle', fontFace: FONT, fontSize: 12, bold: true, color: COL.accent, margin: 0 } } },
        { rect: { x: 0, y: H - 0.38, w: W, h: 0.38, fill: { color: COL.navy } } },
        { text: { text: 'Brazil Delivery Management System · ' + t('rpTitle'), options: { x: M, y: H - 0.38, w: 8, h: 0.38, valign: 'middle', fontFace: FONT, fontSize: 9, color: 'B9C9DE', margin: 0 } } },
        { placeholder: { options: { name: 'title', type: 'title', x: 2.3, y: 0.18, w: 7.2, h: 0.5, align: 'left', valign: 'middle', fontFace: FONT, fontSize: 20, bold: true, color: COL.white, margin: 0 }, text: '' } }
      ],
      slideNumber: { x: W - M - 0.6, y: H - 0.34, w: 0.6, h: 0.3, align: 'right', fontFace: FONT, fontSize: 9, color: 'B9C9DE' }
    });
    let lastSec = null;
    const slide = (sec, title) => { if (sec !== lastSec) { pres.addSection({ title: sec }); lastSec = sec; } const s = pres.addSlide({ masterName: 'BDMS', sectionTitle: sec }); s.addText(title.toUpperCase(), { placeholder: 'title' }); return s; };

    /* 1. Resumo executivo */
    {
      const s = slide(t('rpSecExec'), t('rpSecExec'));
      kpis(s, [[t('createdIn', { y: D.Y }), fmt(D.created)], [CLS['2026 Project'], fmt(D.byC['2026 Project'] || 0)], [CLS['Project Backlog'], fmt(D.byC['Project Backlog'] || 0)],
        [CLS['Warranty phase'], fmt(D.byC['Warranty phase'] || 0)], [CLS['Stock Project'], fmt(D.byC['Stock Project'] || 0)]], 1.05, 1.3);
      const gap = 0.2, w = (CW - 2 * gap) / 3, y = 2.55, h = 4.35;
      const I = INS || buildInsights(DB, ref, null);
      const titles = [t('hSummaryW', { w: wk }), t('hAlerts'), t('hNext')];
      titles.forEach((tt, i) => {
        const x = M + i * (w + gap);
        card(s, x, y, w, h, COL.navy2);
        s.addText(tt.toUpperCase(), { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, isTextBox: true, fontFace: FONT, fontSize: 13, bold: true, color: COL.white, margin: 0 });
      });
      s.addText([{ text: I.summary || '', options: { breakLine: true } }, { text: ' ', options: { fontSize: 4, breakLine: true } },
        ...I.highlights.map((l, i, a) => ({ text: l, options: { bullet: true, breakLine: i < a.length - 1, paraSpaceAfter: 3 } }))],
        { x: M + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.75, isTextBox: true, valign: 'top', fontFace: FONT, fontSize: 9.5, color: 'E3EAF3', margin: 0.02 });
      bullets(s, I.alerts.length ? I.alerts.map(a => `${itx(a.level === 'high' ? 'lvlHigh' : 'lvlMed')}: ${a.text}`) : [itx('none')], M + w + gap + 0.2, y + 0.6, w - 0.4, h - 0.75, 'E3EAF3', 9.5);
      bullets(s, I.actions.length ? I.actions : [itx('noActions')], M + 2 * (w + gap) + 0.2, y + 0.6, w - 0.4, h - 0.75, 'E3EAF3', 9.5);
      s.addNotes(t('aiNote'));
    }

    /* 2. Carteira de projetos */
    {
      const s = slide(t('rpSecPort'), t('rpSecPort'));
      const segs = ['2026 Project', 'Stock Project', 'Warranty phase'];
      card(s, M, 1.05, 4.6, 3.9);
      s.addChart(pres.charts.DOUGHNUT, [{ name: t('dsProjects'), labels: segs.map(k => CLS[k]), values: segs.map(k => D.byC[k] || 0) }],
        chartOpts(M + 0.1, 1.15, 4.4, 3.7, t('rpDonut', { y: D.Y }), { holeSize: 55, chartColors: [COL.s1, COL.s2, COL.s3], dataLabelColor: COL.white, dataLabelFontSize: 10, showPercent: false, legendPos: 'r' }));
      card(s, M + 4.8, 1.05, CW - 4.8, 3.9);
      s.addChart(pres.charts.BAR, D.levelData.map(d => ({ name: LVL[d.l], labels: ['ToB', 'ToG'], values: d.v })),
        chartOpts(M + 4.9, 1.15, CW - 5.0, 3.7, t('rpLevel', { n: D.activeN }), { barDir: 'col', barGrouping: 'clustered', dataLabelPosition: 'outEnd' }));
      card(s, M, 5.1, CW, 1.85);
      s.addText(t('hSuperv').toUpperCase(), { x: M + 0.2, y: 5.18, w: CW - 0.4, h: 0.35, isTextBox: true, fontFace: FONT, fontSize: 12, bold: true, color: COL.navy, margin: 0 });
      const pfl = ((INS || buildInsights(DB, ref, null)).portfolio || []).slice(0, 5);
      s.addText(pfl.length ? pfl.flatMap((o, i) => [{ text: `${o.name}: `, options: { bold: true } },
          { text: pfLine(o), options: { breakLine: i < pfl.length - 1 } }]) : '–',
        { x: M + 0.2, y: 5.55, w: CW - 0.4, h: 1.35, isTextBox: true, valign: 'top', fontFace: FONT, fontSize: 10, color: COL.navy, margin: 0, paraSpaceAfter: 2 });
    }

    /* 3. Major Projects ganhos */
    if (D.majors.length) {
      const s = slide(t('rpSecMajor'), t('rpSecMajor'));
      kpis(s, [[t('kMajor'), fmt(D.majors.length)], [t('kMajorVal'), usd(D.majors.reduce((a, r) => a + (r.amt || 0), 0))],
        [t('kMajorInc'), usd(D.majors.reduce((a, r) => a + (r.inc || 0), 0))], [t('kMajorCtr'), fmt(D.majors.reduce((a, r) => a + r.nc, 0))]], 1.05, 1.2);
      const rows = D.majors.slice(0, 13).map(r => [trunc(r.nome, 62), r.pm || '–', LVL[r.l] || r.l || '–', r.amt != null ? usd(r.amt) : '–', r.inc ? usd(r.inc) : '–', fmt(r.nc), fdate(r.upd)]);
      table(s, [t('cProject'), 'Delivery PM', t('cLevel'), t('cValue'), t('cIncome'), t('cContracts'), t('cUpdated')], rows, M, 2.42, CW, [4.6, 1.9, 1.3, 1.25, 1.25, 1.0, 1.23], 9.5);
      if (D.majors.length > 13) s.addText(t('rpMore', { n: D.majors.length - 13 }), { x: M, y: 6.75, w: CW, h: 0.25, isTextBox: true, fontFace: FONT, fontSize: 9, color: COL.muted, margin: 0 });
    }

    /* 4. Suporte técnico */
    {
      const s = slide(t('rpSecSup'), t('rpSecSup'));
      kpis(s, [[t('kCCY', { y: D.Y }), D.cc.length ? fmt(D.ccTot) : '–'], [t('kEngY', { y: D.Y }), fmt(D.SY.length), t('kEngD', { n: fmt(D.withItr), w: D.maxW, c: fmt(D.SY.filter(x => x.st === 'Closed' && x.wc === D.maxW).length) })],
        [t('kItr', { y: D.Y }), fmt(D.iRule.length)], [t('kOpenWait'), fmt(D.openT.length)]], 1.05, 1.2);
      const half = (CW - 0.2) / 2, x2 = M + half + 0.2;
      card(s, M, 2.42, half, 2.28); card(s, x2, 2.42, half, 2.28); card(s, M, 4.8, half, 2.15); card(s, x2, 4.8, half, 2.15);
      if (D.cc.length) s.addChart(pres.charts.BAR, [
          { name: t('dsSupport'), labels: D.cc.map(r => D.ML[+r.mes.slice(5, 7) - 1]), values: D.cc.map(r => (r.tot || 0) - (r.rma || 0)) },
          { name: 'RMA', labels: D.cc.map(r => D.ML[+r.mes.slice(5, 7) - 1]), values: D.cc.map(r => r.rma || 0) }],
        chartOpts(M + 0.05, 2.47, half - 0.1, 2.18, t('hCC') + ' ' + D.Y, { barDir: 'col', barGrouping: 'stacked', dataLabelPosition: 'ctr', dataLabelColor: COL.white, dataLabelFontSize: 7 }));
      if (D.itrMonths.length) s.addChart(pres.charts.BAR, [{ name: 'ITRs', labels: D.itrMonths.map(m => D.ML[m - 1]), values: D.itrMonths.map(m => D.iRule.filter(r => r.mo === m).length) }],
        chartOpts(x2 + 0.05, 2.47, half - 0.1, 2.18, t('hItrMonth') + ' ' + D.Y, { barDir: 'col', showLegend: false, dataLabelPosition: 'outEnd', chartColors: [COL.s1] }));
      if (D.prod.length) s.addChart(pres.charts.BAR, [{ name: 'Issues', labels: D.prod.map(p => p[0]).reverse(), values: D.prod.map(p => p[1]).reverse() }],
        chartOpts(M + 0.05, 4.85, half - 0.1, 2.05, t('rpProd'), { barDir: 'bar', showLegend: false, dataLabelPosition: 'outEnd', chartColors: [COL.s1], catAxisLabelFrequency: 1, catAxisLabelFontSize: 8, barGapWidthPct: 60 }));
      s.addText(t('hOpen').toUpperCase(), { x: x2 + 0.2, y: 4.88, w: half - 0.4, h: 0.32, isTextBox: true, fontFace: FONT, fontSize: 12, bold: true, color: COL.navy, margin: 0 });
      const ST = LB().ST;
      const op = D.openT.sort((a, b) => (a.wo || 0) - (b.wo || 0)).slice(0, 6).map(x => [trunc(x.cust, 22), trunc(x.prod || x.cat, 26), x.resp || '–', trunc(ST[x.rs] || x.rs || x.st, 24), x.wo ?? '–']);
      if (op.length) table(s, [t('cCustomer'), t('cProduct'), t('cResp'), 'Status', t('cWk')], op, x2 + 0.15, 5.25, half - 0.3, [1.55, 1.75, 0.9, 1.45, 0.47], 8.5);
      else s.addText(t('noOpen'), { x: x2 + 0.2, y: 5.3, w: half - 0.4, h: 0.3, isTextBox: true, fontFace: FONT, fontSize: 10, color: COL.muted, margin: 0 });
    }

    /* 5. RMA */
    {
      const s = slide(t('rpSecRma'), t('rpSecRma'));
      kpis(s, [[t('kRmaIn', { y: D.Y }), fmt(D.rY.length), D.rP.length ? t('kRmaInPrev', { n: fmt(D.rP.length), y: D.Y - 1 }) : ''],
        [t('kOpen'), fmt(D.rOpen.length), t('kOver30', { n: fmt(D.old) })], [t('kOow'), D.oow != null ? D.oow + '%' : '–'], [t('kAvg'), D.avg != null ? t('days', { n: fmt(D.avg) }) : '–']], 1.05, 1.2);
      const keys = LABELS.pt.MES, wl = 7.9, wr = CW - wl - 0.2;
      card(s, M, 2.42, wl, 2.28);
      s.addChart(pres.charts.BAR, [{ name: String(D.Y), labels: D.ML, values: keys.map(m => D.rY.filter(r => r.m === m).length) },
        { name: String(D.Y - 1), labels: D.ML, values: keys.map(m => D.rP.filter(r => r.m === m).length) }],
        chartOpts(M + 0.05, 2.47, wl - 0.1, 2.18, t('rpYoY', { y: D.Y, p: D.Y - 1 }), { barDir: 'col', barGrouping: 'clustered', dataLabelPosition: 'outEnd', dataLabelFontSize: 7 }));
      card(s, M + wl + 0.2, 2.42, wr, 4.53);
      s.addText(t('hMap').toUpperCase(), { x: M + wl + 0.4, y: 2.5, w: wr - 0.4, h: 0.32, isTextBox: true, fontFace: FONT, fontSize: 12, bold: true, color: COL.navy, margin: 0 });
      const tot = D.rY.length || 1;
      table(s, ['UF', t('rpState'), 'RMAs', '%'], D.ufs.slice(0, 12).map(([u, n]) => [u, UF_NAME[u] || u, fmt(n), Math.round(n / tot * 100) + '%']), M + wl + 0.35, 2.9, wr - 0.3, [0.5, 2.0, 0.8, 0.8], 9);
      const half = (wl - 0.2) / 2;
      card(s, M, 4.8, half, 2.15); card(s, M + half + 0.2, 4.8, half, 2.15);
      if (D.scs.length) s.addChart(pres.charts.BAR, ['IW', 'OOW'].map(k => ({ name: k, labels: D.scs.map(x => x.replace(' Service Center', '')), values: D.scs.map(x => D.rY.filter(r => r.sc === x && r.w === k).length) })),
        chartOpts(M + 0.05, 4.85, half - 0.1, 2.05, t('hSC'), { barDir: 'col', barGrouping: 'clustered', dataLabelPosition: 'outEnd' }));
      const ag = ['0~7 dias', '08~30 dias', '> 30 dias'];
      s.addChart(pres.charts.BAR, ['IW', 'OOW'].map(k => ({ name: k, labels: [t('age1'), t('age2'), t('age3')], values: ag.map(a => D.rOpen.filter(r => r.dur === a && r.w === k).length) })),
        chartOpts(M + half + 0.25, 4.85, half - 0.1, 2.05, t('hAge'), { barDir: 'col', barGrouping: 'clustered', dataLabelPosition: 'outEnd' }));
    }

    /* 6. Riscos e issues do report */
    {
      const s = slide(t('rpSecRisk'), t('rpHot'));
      const mr = ((INS || buildInsights(DB, ref, null)).majorRisks || []).slice(0, 10);
      if (mr.length) table(s, [t('cProject'), 'Delivery PM', t('cOpenRisk'), t('cUpdated')],
        mr.map(h => [trunc(h.name, 48), h.pm || '–', h.risks.slice(0, 2).map(x => '• ' + trunc(x, 150)).join('\n'), fdate(h.upd)]), M, 1.05, CW, [3.0, 1.7, CW - 5.9, 1.2], 8.5);
      else s.addText(t('noMajorRisks'), { x: M, y: 1.2, w: CW, h: 0.4, isTextBox: true, fontFace: FONT, fontSize: 12, color: COL.muted, margin: 0 });
    }

    /* 7. Riscos e issues em aberto (RAT) */
    {
      const s = slide(t('rpSecRisk'), t('rpRat'));
      const IMP = { High: t('impHigh'), Medium: t('impMedium'), Low: t('impLow') };
      const AG = { '> 30 days': t('age3'), '08 ~ 30 days': t('age2'), '0~7 days': t('age1') };
      kpis(s, [[t('kRiskOpen'), fmt(D.ratOpen)], [t('kImpHigh'), fmt(D.ratOpenHigh.length)], [t('kOver30r'), fmt(D.ratOpenHigh.filter(r => r.ag === '> 30 days').length)]], 1.05, 1.0);
      const rows = D.ratOpenHigh.slice(0, 12).map(r => [trunc(r.project, 34), r.owner || '–', r.type === 'Risk' ? t('tRisk') : t('tIssue'), trunc(r.title, 70), IMP[r.imp] || r.imp, AG[r.ag] || r.ag || '–', fdate(r.fup)]);
      if (rows.length) table(s, [t('cProject'), t('cResp'), t('cType'), t('cTitle'), t('fImp'), 'Aging', t('cFup')], rows, M, 2.25, CW, [2.5, 1.7, 0.8, 4.0, 1.0, 1.25, 1.28], 9);
      if (D.ratOpenHigh.length > 12) s.addText(t('rpMore', { n: D.ratOpenHigh.length - 12 }), { x: M, y: 6.75, w: CW, h: 0.25, isTextBox: true, fontFace: FONT, fontSize: 9, color: COL.muted, margin: 0 });
    }

    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const name = `BDMS_${LANG === 'pt' ? 'Relatorio' : 'Report'}_W${wk}_${stamp}.pptx`;
    await pres.writeFile({ fileName: name });
    return name;
  };
})();
