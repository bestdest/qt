/* ══════════ 성경 책 정보 · 리딩지저스 일정 ══════════ */
/*__DATA__*/

const ABBR = {}, FULL = {};
BOOKS.forEach(b => { ABBR[b.a] = b; FULL[b.n] = b; });

/* ══════════ 날짜 유틸 ══════════ */
const DOW = ['일','월','화','수','목','금','토'];
const pad = n => String(n).padStart(2,'0');
const ymd = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
function todayStr(){ return ymd(new Date()); }
function korDate(s){ const d=parse(s); return (d.getMonth()+1)+'월 '+d.getDate()+'일 '+DOW[d.getDay()]+'요일'; }
function korDateShort(s){ const d=parse(s); return (d.getMonth()+1)+'/'+d.getDate(); }
function addDays(s,n){ const d=parse(s); d.setDate(d.getDate()+n); return ymd(d); }

/* 일정 인덱스: 날짜 → {read, dawn, verse, verseText, label} */
const DAYS = {};
WEEKS.forEach(w => {
  let d = parse(w.s);
  w.d.forEach(pair => {
    DAYS[ymd(d)] = { read:pair[0], dawn:pair[1], verse:w.v, verseText:w.t, label:w.l, week:w.s };
    d.setDate(d.getDate()+1);
  });
});
const FIRST = WEEKS[0].s, LAST = Object.keys(DAYS).sort().slice(-1)[0];

function daySchedule(date){
  return DAYS[date] || { read:'', dawn:'', verse:'', verseText:'', label:'주일', week:'' };
}
function isSunday(date){ return parse(date).getDay() === 0; }

/* ══════════ 본문 표기 → 사람이 읽는 말 ══════════ */
/* 한국어 조사 처리 */
function hasJong(w){
  const c = String(w).trim().slice(-1);
  const code = c.charCodeAt(0);
  if(code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 !== 0;
  if(/[0-9]/.test(c)) return '013678'.includes(c);
  return true;
}
function josa(w, pair){ return w + (hasJong(w) ? pair[0] : pair[1]); }

function expand(ref){
  if(!ref) return '';
  const bb = ref.match(/^([가-힣]+)\s*-\s*([가-힣]+)$/);
  if(bb && ABBR[bb[1]] && ABBR[bb[2]]) return ABBR[bb[1]].n+' – '+ABBR[bb[2]].n;
  // '창 1-4' → '창세기 1-4장' / '욜 1-암 3' → '요엘 1장 - 아모스 3장' / '창 3:1-13' → '창세기 3:1-13'
  const two = ref.match(/^([가-힣]+)\s*(\d+)\s*-\s*([가-힣]+)\s*(\d+)$/);
  if(two && ABBR[two[1]] && ABBR[two[3]])
    return ABBR[two[1]].n+' '+two[2]+'장 – '+ABBR[two[3]].n+' '+two[4]+'장';
  const m = ref.match(/^([가-힣]+)\s*(.*)$/);
  if(!m) return ref;
  const b = ABBR[m[1]];
  const name = b ? b.n : m[1];
  const rest = m[2].trim();
  if(!rest) return name;
  if(rest.includes(':')) return name+' '+rest;
  return name+' '+rest+'장';
}
function bookOf(ref){
  if(!ref) return null;
  const m = ref.match(/^([가-힣]+)/);
  return m ? ABBR[m[1]] : null;
}
function chapterCount(ref){
  const m = ref && ref.match(/^[가-힣]+\s*(\d+)\s*-\s*(?:[가-힣]+\s*)?(\d+)$/);
  if(!m) return 0;
  const a=+m[1], b=+m[2];
  return b>=a ? b-a+1 : 0;
}

/* ══════════ QT 설명 자동 생성 ══════════ */
const GENRE_LINE = {
  '율법서':'율법서는 하나님이 어떤 분이시고 그 백성이 어떻게 살아야 하는지를 처음부터 알려줍니다.',
  '역사서':'역사서는 사람들의 실제 삶 속에서 하나님이 어떻게 일하셨는지를 보여줍니다.',
  '시가서':'시가서는 하나님 앞에 드리는 솔직한 마음을 그대로 담고 있습니다.',
  '선지서':'선지서는 돌이켜 하나님께 돌아오라고 부르는 말씀입니다.',
  '복음서':'복음서는 예수님이 무엇을 말씀하시고 어떻게 사셨는지를 전합니다.',
  '서신서':'서신서는 믿음을 어떻게 삶으로 살아낼지 구체적으로 권면합니다.',
  '예언서':'요한계시록은 끝까지 다스리시는 주님을 바라보게 합니다.'
};
const ASK = [
  ['이 본문에서 하나님은 어떤 분으로 나타나십니까?','그 하나님 앞에서 오늘 내가 내려놓아야 할 것은 무엇입니까?'],
  ['본문 속 사람들은 하나님께 어떻게 반응합니까?','나는 지금 어느 쪽에 더 가깝습니까?'],
  ['오늘 말씀에서 마음에 걸리거나 오래 머무는 한 구절은 어디입니까?','왜 그 구절이 마음에 남았는지 적어보세요.'],
  ['하나님이 오늘 본문을 통해 고치라고 하시는 마음은 무엇입니까?','그것을 오늘 하루 어떻게 실천할 수 있습니까?'],
  ['이 말씀이 사실이라면 내 하루는 무엇이 달라져야 합니까?','한 가지만 구체적으로 정해보세요.'],
  ['본문에서 하나님이 약속하시는 것은 무엇입니까?','그 약속이 필요한 나의 자리는 어디입니까?']
];
function buildGuide(date, readVs, dawnVs){
  const s = daySchedule(date);
  const rb = bookOf(s.read), db2 = bookOf(s.dawn);
  const q = ASK[parse(date).getDate() % ASK.length];
  const out = [];

  /* ① 오늘 읽는 말씀의 흐름 */
  if(s.label && s.label.includes('복습')){
    out.push({ text:'이번 주는 리딩지저스 복습 기간입니다. 새로 읽어 나가기보다, 지난 몇 주 동안 지나온 말씀 가운데 마음에 걸렸던 곳으로 다시 돌아가 보세요.' });
  } else if(s.read){
    const n = chapterCount(s.read);
    let t = '오늘 리딩지저스에서는 ' + josa(expand(s.read), ['을','를']) + ' 읽습니다.';
    if(rb) t += ' ' + josa(rb.n, ['은','는']) + ' ' + rb.d + '입니다.';
    const hs = headingsOf(readVs, 4);
    if(hs.length >= 2) t += ' 오늘 분량은 ' + hs.map(h => '‘'+h+'’').join(', ') + ' 순서로 이어집니다.';
    else if(n >= 5) t += ' 한 번에 ' + n + '장을 읽게 되니, 한 절씩 뜯어보기보다 이야기 전체의 흐름을 따라가며 읽어보세요.';
    out.push({ text:t });
  } else if(!s.dawn){
    out.push({ text: s.label
      ? '이번 주는 ' + s.label + ' 기간입니다. 정해진 읽기 범위 대신, 예배에서 들은 말씀을 붙들고 묵상해보세요.'
      : '오늘은 정해진 본문이 없습니다. 지난 말씀 가운데 마음에 남은 곳을 다시 펴보세요.' });
  }

  /* ② 새벽본문이 놓인 자리 */
  if(s.dawn){
    let t = '새벽본문은 ' + expand(s.dawn) + '입니다.';
    const dh = headingsOf(dawnVs, 2);
    if(dh.length) t += ' 오늘 아침에는 ' + dh.map(h => '‘'+h+'’').join(', ') + ' 대목 앞에 섭니다.';
    if(db2 && db2 === rb && s.read) t += ' 넓게 읽은 본문 가운데 이 장면만 따로 떼어 더 오래 머물러 보라는 뜻입니다.';
    else if(db2 && GENRE_LINE[db2.g]) t += ' ' + GENRE_LINE[db2.g];
    out.push({ text:t });
    if(dawnVs && dawnVs.length){
      const span = dawnVs.length;
      out.push({ text:'모두 ' + span + '절입니다. 한 번은 눈으로, 한 번은 소리 내어 읽고, 세 번째에는 내 이름을 넣어 읽어보세요. 같은 말씀이 다르게 들릴 것입니다.' });
    }
  }

  /* ③ 관찰 질문 · ④ 생각을 넓히는 질문 */
  out.push({ label:'오늘의 질문', text: q[0] + ' ' + q[1] });
  out.push({ label:'생각을 넓히는 질문', text: widenQ(date, db2 || rb) });

  /* ⑤ 암송구절 */
  if(s.verse) out.push({ text:'이번 주 암송구절은 ' + expand(s.verse) + '입니다. 묵상을 마친 뒤 소리 내어 한 번 읽어보세요.' });
  return out;
}

/* ══════════ 상태 ══════════ */
const ADMIN_NICK = '관리자';   // 이 별명으로 가입한 계정만 관리자 메뉴를 볼 수 있다
let me = null;                 // {uid, name, nick, isAdmin}
let DB = null;                 // claude.use('db')
let route = 'home';
let qtDate = todayStr();
let calCur = new Date();
let sharesToday = {};          // 오늘 날짜 공유 현황
let sharesRange = {};          // 나눔 화면에 보이는 7일 구간: 날짜 → 그 날의 entries
let shareRangeEnd = todayStr();// 조회 중인 7일 구간의 마지막 날
let shareRangeUnsubs = [];
let adminOverrides = {};       // date → {exp, text, read, dawn, verse}
let unsubs = [];

const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const qtKey = (uid, date) => 'qt:'+uid+':'+date;
function myQT(date){ return me ? LS.get(qtKey(me.uid, date), null) : null; }
function allMyQT(){
  const out = {};
  if(!me) return out;
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('qt:'+me.uid+':')) out[k.split(':').pop()] = LS.get(k, null);
    }
  }catch(e){}
  return out;
}

/* ══════════ 토스트 ══════════ */
let toastT;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('on'), 2200);
}

/* ══════════ 라우팅 ══════════ */
function go(r){
  route = r;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's'+'-'+r));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.r === r));
  window.scrollTo(0,0);
  if(r==='bible') renderBible();
  if(r==='share') renderShare();
  if(r==='log') renderCal();
  if(r==='my') renderMy();
  if(r==='home') renderHome();
}

/* ══════════ 홈 ══════════ */
function renderHome(){
  const t = todayStr(), s = daySchedule(t), ov = adminOverrides[t] || {};
  const h = new Date().getHours();
  document.getElementById('greet').textContent =
    h < 5 ? '아직 이른 새벽입니다.' : h < 11 ? '좋은 아침입니다.' :
    h < 17 ? '평안한 오후입니다.' : h < 21 ? '수고한 하루였습니다.' : '하루를 마무리할 시간입니다.';
  document.getElementById('homeDate').textContent = korDate(t);

  const read = ov.read || s.read, dawn = ov.dawn || s.dawn;
  document.getElementById('homeRead').textContent = read ? expand(read) : (isSunday(t) ? '주일 — 함께 예배드립니다' : '복습 기간입니다');
  const n = chapterCount(read);
  document.getElementById('homeReadSub').textContent =
    s.label ? s.label : (n ? n+'장 · 오늘 읽을 분량' : (read ? '오늘 읽을 분량' : '지난 말씀을 다시 읽어보세요'));
  document.getElementById('homeDawn').textContent = dawn ? expand(dawn) : '새벽예배 본문이 없습니다';
  document.getElementById('homeDawnSub').textContent = dawn ? '오늘의 묵상 본문' : '';

  const mine = myQT(t);
  const cta = document.getElementById('homeCta');
  if(mine && mine.completed){ cta.textContent = '오늘 QT를 마쳤습니다 · 다시 보기'; cta.classList.add('done'); }
  else if(mine){ cta.textContent = '쓰던 QT 이어서 하기'; cta.classList.remove('done'); }
  else { cta.textContent = '오늘의 QT 시작하기'; cta.classList.remove('done'); }

  const verse = ov.verse || s.verse;
  document.getElementById('memVerse').textContent = s.verseText || '이번 주 암송구절이 등록되지 않았습니다.';
  document.getElementById('memRef').textContent = verse ? expand(verse) : '';
  document.getElementById('weekRangeLabel').textContent = s.week ? korDate(s.week)+'부터' : '';

  const nz = adminOverrides['notice'] || {};
  const now = Date.now();
  const inWindow = (!nz.from || now >= nz.from) && (!nz.to || now <= nz.to);
  const notice = (nz.text && inWindow) ? nz.text : '';
  document.getElementById('homeNotice').textContent = notice || (DB
    ? '공동체 나눔은 교회 계정으로 로그인한 교인에게만 보입니다.'
    : '지금은 이 기기에만 QT가 저장됩니다. 나눔 기능은 연결이 되면 켜집니다.');

  const mm = t.slice(0,7), all = allMyQT();
  document.getElementById('statMine').textContent =
    Object.keys(all).filter(d => d.startsWith(mm) && all[d] && all[d].completed).length + '일';
  document.getElementById('statDone').textContent = countDone(sharesToday);
}
function countDone(map){
  return Object.values(map||{}).filter(e => e && e.completed && e.share !== 'PRIVATE').length;
}

/* ══════════ QT 집중 화면 ══════════ */
function openQT(date){
  if(!me){ openSheet('sheet-auth'); toast('먼저 시작하기를 눌러주세요'); return; }
  qtDate = date;
  document.getElementById('qt').classList.add('on');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.r === 'qtjump'));
  document.body.style.overflow = 'hidden';
  renderQT();
  document.getElementById('qt').scrollTop = 0;
}
function closeQT(){
  document.getElementById('qt').classList.remove('on');
  document.body.style.overflow = '';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.r === route));
  refreshScreen();               // 화면 전환 없이 지금 보던 탭만 다시 그린다 (스크롤 위치 유지)
}
function refreshScreen(){
  if(route==='bible') renderBible();
  else if(route==='share') renderShare();
  else if(route==='log') renderCal();
  else if(route==='my') renderMy();
  else renderHome();
}
/* 탭을 눌러 다른 화면으로 이동 — QT가 열려 있으면 먼저 닫는다 */
function tabGo(r){
  const qtEl = document.getElementById('qt');
  if(qtEl.classList.contains('on')){
    qtEl.classList.remove('on');
    document.body.style.overflow = '';
  }
  go(r);
}
function stepQT(n){
  const nd = addDays(qtDate, n);
  if(nd > todayStr() && n > 0) return;
  qtDate = nd; renderQT(); document.getElementById('qt').scrollTop = 0;
}
let qtToken = 0;
async function renderQT(){
  const token = ++qtToken;
  const s = daySchedule(qtDate), ov = adminOverrides[qtDate] || {};
  const read = ov.read || s.read, dawn = ov.dawn || s.dawn;

  document.getElementById('qtTitle').textContent = qtDate === todayStr() ? '오늘의 QT' : '지난 QT';
  document.getElementById('qtDate').textContent = parse(qtDate).getFullYear()+'년 '+korDate(qtDate);
  document.getElementById('qtNext').disabled = qtDate >= todayStr();

  document.getElementById('qtRead').textContent = read ? expand(read) : (isSunday(qtDate) ? '주일 예배' : '복습 기간');
  const n = chapterCount(read);
  document.getElementById('qtReadSub').textContent = n ? n+'장' : (s.label || '');
  document.getElementById('qtDawn').textContent = dawn ? expand(dawn) : '—';

  const foldR = document.getElementById('foldRead'), foldD = document.getElementById('foldDawn');
  foldR.style.display = read ? 'block' : 'none';
  foldD.style.display = dawn ? 'block' : 'none';
  foldR.open = LS.get('foldRead:v2', false);
  foldD.open = LS.get('foldDawn:v2', false);
  document.getElementById('sumRead').textContent = read ? expand(read) + ' 전문' : '본문 읽기';
  document.getElementById('sumDawn').textContent = dawn ? expand(dawn) + ' 전문' : '본문 읽기';

  /* 저장된 내용 먼저 채운다 — 본문 로딩을 기다리지 않는다 */
  const saved = myQT(qtDate) || {};
  document.getElementById('reflection').value = saved.reflection || '';
  document.getElementById('prayer').value = saved.prayer || '';
  document.getElementById('isDone').checked = (saved.completed !== undefined) ? saved.completed : true;
  document.getElementById('sharePrayer').checked = !!saved.sharePrayer;
  const sv = saved.share || 'PRIVATE';
  document.querySelectorAll('input[name=share]').forEach(r => { r.checked = (r.value === sv); });
  syncShareUI();
  document.getElementById('savedNote').textContent =
    saved.updatedAt ? new Date(saved.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+' 저장됨' : '';

  const readEl = document.getElementById('qtReadText'), dawnEl = document.getElementById('qtScripture');
  attachLongPressCopy(readEl); attachLongPressCopy(dawnEl);
  readEl.innerHTML = '<div class="note">본문을 불러오는 중입니다…</div>';
  dawnEl.innerHTML = '<div class="note">본문을 불러오는 중입니다…</div>';
  paintGuide(qtDate, null, null);

  const [readVs, dawnVs] = await Promise.all([getPassage(read), getPassage(dawn)]);
  if(token !== qtToken) return;

  const miss = BIB.ready
    ? '이 범위의 본문을 찾지 못했습니다. 관리자 화면에서 본문 파일을 다시 확인해주세요.'
    : '성경 본문이 아직 연결되지 않았습니다. 관리자가 교회 성경 파일을 한 번 올리면 이 자리에 본문이 그대로 보입니다.';
  paintVerses(readEl, readVs, read, miss);
  paintVerses(dawnEl, ov.text ? null : dawnVs, dawn, miss);
  if(ov.text){ dawnEl.className = 'vs'; dawnEl.innerHTML = '<p>' + esc(ov.text).replace(/\n/g,'</p><p>') + '</p>'; dawnEl.dataset.copyText = ov.text; }
  paintGuide(qtDate, readVs, dawnVs);
}
function renderGuideItems(el, items){
  items.forEach(item => {
    const p = document.createElement('p');
    if(item.label){ p.className = 'ask'; p.innerHTML = '<small>'+esc(item.label)+'</small>'+esc(item.text); }
    else p.textContent = item.text;
    el.appendChild(p);
  });
}
/* 관리자가 쓴 설명 원문을 파싱한다.
   일반 줄 = 설명 문단, "Q1: ..." = 오늘의 질문, "Q2: ..." = 생각을 넓히는 질문 */
function parseExp(text){
  const out = [];
  text.split(/\n+/).forEach(line => {
    const l = line.trim(); if(!l) return;
    let m;
    if((m = l.match(/^Q1[:：]\s*(.*)$/))) out.push({ label:'오늘의 질문', text:m[1] });
    else if((m = l.match(/^Q2[:：]\s*(.*)$/))) out.push({ label:'생각을 넓히는 질문', text:m[1] });
    else out.push({ text:l });
  });
  return out;
}
function paintGuide(date, readVs, dawnVs){
  const ov = adminOverrides[date] || {};
  const g = document.getElementById('qtGuide');
  g.innerHTML = '';
  if(ov.exp){
    renderGuideItems(g, parseExp(ov.exp));
    return;
  }
  /* 아직 이 날짜의 손으로 쓴 설명이 없다 — 자동 생성본을 눌러야만 보여준다 */
  g.innerHTML =
    '<p class="guide-pending">이번 주 설명은 아직 준비 중입니다. 그동안은 간단한 자동 설명을 볼 수 있습니다.</p>'+
    '<button class="act" id="genGuideBtn">간단 설명 보기</button>';
  const btn = document.getElementById('genGuideBtn');
  btn.onclick = () => {
    g.innerHTML = '<p class="guide-pending">아래는 자동으로 만든 간단 설명입니다.</p>';
    renderGuideItems(g, buildGuide(date, readVs, dawnVs));
  };
}
document.addEventListener('toggle', e => {
  if(e.target.id === 'foldRead' || e.target.id === 'foldDawn') LS.set(e.target.id+':v2', e.target.open);
}, true);

function syncShareUI(){
  let v = 'PRIVATE';
  document.querySelectorAll('input[name=share]').forEach(r => {
    r.closest('.share-opt').classList.toggle('sel', r.checked);
    if(r.checked) v = r.value;
  });
  document.getElementById('prayerShareWrap').style.display = v === 'CONTENT' ? 'flex' : 'none';
}
document.addEventListener('change', e => { if(e.target.name === 'share') syncShareUI(); });

async function saveQT(){
  if(!me) { openSheet('sheet-auth'); return; }
  const share = (document.querySelector('input[name=share]:checked')||{}).value || 'PRIVATE';
  const rec = {
    reflection: document.getElementById('reflection').value.trim(),
    prayer: document.getElementById('prayer').value.trim(),
    completed: document.getElementById('isDone').checked,
    sharePrayer: document.getElementById('sharePrayer').checked,
    share, updatedAt: Date.now()
  };
  if(!rec.reflection && !rec.prayer && !rec.completed){ toast('한 줄이라도 적거나 완료를 표시해주세요'); return; }
  LS.set(qtKey(me.uid, qtDate), rec);
  document.getElementById('savedNote').textContent = '방금 저장됨';
  const t = rec.completed ? '오늘 QT를 마쳤습니다' : '여기까지 저장했습니다';
  closeQT(); go('home'); toast(t);
  await pushShare(qtDate, rec);
  renderHome();
  setTimeout(() => checkBadges(), 1500);
}

/* ══════════ 공유 (db) ══════════ */
function entryFrom(rec){
  const e = { name: me.nick, realName: me.name, completed: !!rec.completed, share: rec.share, at: rec.updatedAt };
  if(rec.share === 'CONTENT'){
    e.reflection = rec.reflection;
    if(rec.sharePrayer && rec.prayer) e.prayer = rec.prayer;
  }
  return e;
}
async function writeDoc(path, body){
  if(!DB) return false;
  const ref = DB.doc(path);
  try{ await ref.update(body); return true; }
  catch(err){
    try{
      const snap = await ref.get();
      if(!snap.exists){ await ref.set(body); return true; }
      await ref.update(body); return true;
    }catch(e2){ return false; }
  }
}
async function pushShare(date, rec){
  if(!DB || !me) return;
  const body = { entries: {} };
  body.entries[me.uid] = entryFrom(rec);
  const ok = await writeDoc('shares/'+date, body);
  if(!ok && rec.share !== 'PRIVATE') toast('나눔 저장에 실패했습니다. 잠시 뒤 다시 저장해주세요');
}
/* 나눔 공감 반응 — QT 나눔에 어울리는 다섯 가지로 구성 */
const REACTIONS = [
  { id:'pray',  icon:'🙏', label:'기도했어요' },
  { id:'grace', icon:'❤️', label:'은혜가 돼요' },
  { id:'cheer', icon:'💪', label:'응원해요' },
  { id:'joy',   icon:'😊', label:'함께 기뻐요' },
  { id:'sad',   icon:'🥲', label:'함께 마음써요' }
];
function reactionMap(entry, rid){
  const m = (entry.reactions && entry.reactions[rid]) || {};
  if(rid === 'pray' && entry.prayers) return Object.assign({}, entry.prayers, m); // 예전 기도했어요 기록과 합침
  return m;
}
async function toggleReaction(date, uid, rid){
  if(!DB || !me) { toast('로그인 후 사용할 수 있습니다'); return; }
  const entry = (sharesRange[date] && sharesRange[date][uid]) || {};
  const cur = reactionMap(entry, rid);
  const body = { entries: {} };
  body.entries[uid] = { reactions: {} };
  body.entries[uid].reactions[rid] = {};
  body.entries[uid].reactions[rid][me.uid] = cur[me.uid] ? false : true;
  await writeDoc('shares/'+date, body);
}
async function addComment(date, uid, input){
  const text = input.value.trim();
  if(!text) return;
  if(!DB || !me){ toast('로그인 후 사용할 수 있습니다'); return; }
  const cid = 'c'+Date.now().toString(36);
  const body = { entries: {} };
  body.entries[uid] = { comments: {} };
  body.entries[uid].comments[cid] = { by: me.uid, name: me.nick, text, at: Date.now() };
  input.value = '';
  await writeDoc('shares/'+date, body);
  LS.set('badge:firstComment', true);
  checkBadges();
}

function watchShares(date){
  if(!DB) return;
  const un = DB.doc('shares/'+date).onSnapshot(snap => {
    const data = snap.exists ? (snap.data().entries || {}) : {};
    sharesToday = data; if(route==='home') renderHome();
    notePrayersForMe(date, data);
  }, () => {});
  unsubs.push(un);
}

/* ══════════ 나눔 화면 (최근 7일, 최신순) ══════════ */
let shareFilterUid = null;   // 특정 교인의 글만 볼 때 그 uid
function shareRangeDates(){
  const out = []; let d = shareRangeEnd;
  for(let i=0;i<7;i++){ out.push(d); d = addDays(d,-1); }
  return out;                     // [최신날짜 ... 6일전] 순
}
function subscribeShareRange(){
  shareRangeUnsubs.forEach(u => u()); shareRangeUnsubs = [];
  if(!DB){ paintFeed(); return; }
  shareRangeDates().forEach(ds => {
    const un = DB.doc('shares/'+ds).onSnapshot(snap => {
      sharesRange[ds] = snap.exists ? (snap.data().entries || {}) : {};
      notePrayersForMe(ds, sharesRange[ds]);
      if(route==='share') paintFeed();
    }, () => {});
    shareRangeUnsubs.push(un);
  });
}
function shareRangeMove(weeks){
  const nd = addDays(shareRangeEnd, weeks*7);
  shareRangeEnd = nd > todayStr() ? todayStr() : nd;
  shareFilterUid = null;
  subscribeShareRange();
  renderShare();
}
function renderShare(){
  const dates = shareRangeDates();
  document.getElementById('shareRangeLabel').textContent =
    korDateShort(dates[dates.length-1])+' ~ '+korDateShort(dates[0]);
  document.getElementById('shareNextBtn').disabled = shareRangeEnd >= todayStr();
  paintCheers();
  paintFeed();
}
function setShareFilter(uid){
  shareFilterUid = (shareFilterUid === uid) ? null : uid;
  paintFeed();
}
function paintFeed(){
  const dates = shareRangeDates();
  const merged = [], doneMap = new Map();
  dates.forEach(ds => {
    const entries = sharesRange[ds] || {};
    Object.entries(entries).forEach(([uid,e]) => {
      if(!e || !e.share) return;
      if(e.completed) doneMap.set(uid, e.name);
      if(e.share !== 'PRIVATE') merged.push({ uid, date:ds, e });
    });
  });
  document.getElementById('shareCount').textContent = doneMap.size ? doneMap.size+'명 완료' : '';
  const chips = document.getElementById('doneChips');
  chips.innerHTML = '';
  doneMap.forEach((name, uid) => {
    const c = document.createElement('button'); c.type = 'button';
    c.className = 'chip'+(shareFilterUid===uid ? ' on' : '');
    c.innerHTML = esc(name)+'<b>✓</b>';
    c.onclick = () => setShareFilter(uid);
    chips.appendChild(c);
  });

  const filterNote = document.getElementById('shareFilterNote');
  if(shareFilterUid && doneMap.has(shareFilterUid)){
    filterNote.style.display = 'flex';
    filterNote.querySelector('span').textContent = esc(doneMap.get(shareFilterUid))+'님의 글만 보는 중';
  } else {
    shareFilterUid = null;
    filterNote.style.display = 'none';
  }

  const feed = document.getElementById('shareFeed');
  let posts = merged.filter(m => m.e.share === 'CONTENT' && (m.e.reflection || m.e.prayer))
                     .sort((a,b) => (b.e.at||0) - (a.e.at||0));
  if(shareFilterUid) posts = posts.filter(m => m.uid === shareFilterUid);
  feed.innerHTML = '';
  if(!posts.length){
    const msg = shareFilterUid
      ? '이 기간에는 이 교인이 나눈 묵상이 없습니다.'
      : (DB ? '이번 주에는 아직 나눈 묵상이 없습니다.<br>오늘의 QT에서 “나의 묵상 내용을 나누기”를 선택하면<br>이곳에 가장 먼저 올라갑니다.'
            : '나눔 기능을 사용할 수 없는 화면입니다.');
    feed.innerHTML = '<div class="empty">'+msg+'</div>';
    return;
  }
  posts.forEach(m => feed.appendChild(postEl(m.uid, m.e, daySchedule(m.date), m.date)));
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function postEl(uid, e, sch, date){
  const d = document.createElement('div'); d.className = 'post';
  const cmts = Object.entries(e.comments || {}).sort((a,b) => (a[1].at||0) - (b[1].at||0));
  const reactHtml = REACTIONS.map(r => {
    const m = reactionMap(e, r.id), cnt = Object.values(m).filter(Boolean).length, mine = me && m[me.uid];
    return '<button class="act'+(mine?' on':'')+'" data-r="'+r.id+'" title="'+esc(r.label)+'">'+r.icon+(cnt?' '+cnt:'')+'</button>';
  }).join('');
  d.innerHTML =
    '<div class="post-h"><div class="ava">'+esc((e.name||'?').slice(0,1))+'</div>'+
    '<div><b>'+esc(e.name)+'</b><small>'+(e.at ? new Date(e.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '')+'</small></div></div>'+
    '<div class="post-ref">'+esc(expand((adminOverrides[date]||{}).dawn || sch.dawn) || korDate(date))+'</div>'+
    '<div class="post-body">'+esc(e.reflection||'')+'</div>'+
    (e.prayer ? '<div class="post-ref" style="margin-top:14px">기도제목</div><div class="post-body">'+esc(e.prayer)+'</div>' : '')+
    '<div class="post-acts">'+reactHtml+'<button class="act cmtbtn">💬 댓글'+(cmts.length?' '+cmts.length:'')+'</button></div>'+
    '<div class="cmt" style="display:'+(cmts.length?'block':'none')+'">'+
      cmts.map(([,c]) => '<div class="cmt-item"><b>'+esc(c.name)+'</b>'+esc(c.text)+'</div>').join('')+
      '<div class="cmt-form"><input placeholder="따뜻한 한마디를 남겨보세요"><button>등록</button></div>'+
    '</div>';
  d.querySelectorAll('.post-acts .act[data-r]').forEach(btn => {
    btn.onclick = () => toggleReaction(date, uid, btn.dataset.r);
  });
  const cmtBox = d.querySelector('.cmt');
  d.querySelector('.cmtbtn').onclick = () => { cmtBox.style.display = cmtBox.style.display === 'none' ? 'block' : 'none'; };
  const inp = d.querySelector('.cmt-form input'), btn = d.querySelector('.cmt-form button');
  btn.onclick = () => addComment(date, uid, inp);
  inp.onkeydown = ev => { if(ev.key === 'Enter') btn.click(); };
  return d;
}

/* ══════════ 성경 ══════════ */
let bibleTestament = '구약', bibleBook = null;
function renderBible(){
  const nav = document.getElementById('bibleNav'), view = document.getElementById('bibleView');
  nav.innerHTML = '<div class="seg"><button class="'+(bibleTestament==='구약'?'on':'')+'" data-t="구약">구약 39권</button>'+
                  '<button class="'+(bibleTestament==='신약'?'on':'')+'" data-t="신약">신약 27권</button></div>';
  nav.querySelectorAll('button').forEach(b => b.onclick = () => { bibleTestament = b.dataset.t; bibleBook = null; renderBible(); });

  const list = BOOKS.filter((b,i) => bibleTestament==='구약' ? i < 39 : i >= 39);
  if(!bibleBook){
    view.innerHTML = '<div class="booklist">'+list.map(b => '<button class="bookbtn" data-a="'+b.a+'">'+b.n+'</button>').join('')+'</div>';
    view.querySelectorAll('.bookbtn').forEach(b => b.onclick = () => { bibleBook = ABBR[b.dataset.a]; renderBible(); });
    return;
  }
  const b = bibleBook;
  let h = '<button class="act" style="margin-bottom:14px" id="bk">← '+bibleTestament+' 목록</button>'+
    '<h3 class="sec-h" style="font-size:22px">'+b.n+' <em>'+b.c+'장 · '+b.g+'</em></h3>'+
    '<p style="color:var(--sub);font-size:14.5px;line-height:1.75;margin:0 0 20px">'+b.d+'</p>'+
    '<div class="chapgrid">';
  for(let i=1;i<=b.c;i++) h += '<button class="chapbtn" data-c="'+i+'">'+i+'</button>';
  h += '</div><div id="chapView"></div>';
  view.innerHTML = h;
  view.querySelector('#bk').onclick = () => { bibleBook = null; renderBible(); };
  view.querySelectorAll('.chapbtn').forEach(c => c.onclick = async () => {
    const box = document.getElementById('chapView');
    box.innerHTML = '<div class="fold" style="margin-top:20px"><div class="fold-in"><div class="note">불러오는 중입니다…</div></div></div>';
    const vs = await getPassage(b.a + ' ' + c.dataset.c);
    box.innerHTML = '<div class="fold" style="margin-top:20px"><div class="fold-in"><div class="vs" id="chapText"></div></div></div>';
    const chapEl = document.getElementById('chapText');
    paintVerses(chapEl, vs, b.a+' '+c.dataset.c,
      BIB.ready ? '이 장의 본문을 찾지 못했습니다.'
                : '성경 본문이 아직 연결되지 않았습니다. 관리자 화면에서 교회 성경 파일을 한 번 올리면 이곳에 본문이 표시됩니다.');
    attachLongPressCopy(chapEl);
    box.scrollIntoView({behavior:'smooth', block:'start'});
  });
}

/* ══════════ 기록 캘린더 ══════════ */
function calMove(n){ calCur.setMonth(calCur.getMonth()+n); renderCal(); }
function renderCal(){
  const y = calCur.getFullYear(), m = calCur.getMonth();
  document.getElementById('calLabel').textContent = y+'년 '+(m+1)+'월';
  const first = new Date(y,m,1), days = new Date(y,m+1,0).getDate();
  const all = allMyQT();
  let h = '';
  DOW.forEach((d,i) => h += '<div class="dow'+(i===0?' sun':'')+'">'+d+'</div>');
  for(let i=0;i<first.getDay();i++) h += '<div class="cell blank"></div>';
  for(let d=1;d<=days;d++){
    const ds = y+'-'+pad(m+1)+'-'+pad(d);
    const r = all[ds];
    const cls = 'cell'+(r ? ' has' : '')+(ds===todayStr() ? ' today' : '')+
      (selectMode ? ' pickable' : '')+(selectMode && selectedDates.has(ds) ? ' sel' : '');
    h += '<button class="'+cls+'" data-d="'+ds+'">'+d+(r && r.completed && !selectMode ? '<i class="dot"></i>' : '')+'</button>';
  }
  const cal = document.getElementById('cal');
  cal.innerHTML = h;
  cal.querySelectorAll('.cell[data-d]').forEach(c => {
    c.onclick = () => selectMode ? toggleDate(c.dataset.d) : showLog(c.dataset.d);
  });
  if(!selectMode){
    document.getElementById('logDetail').innerHTML =
      '<div class="empty">날짜를 누르면 그날의 QT를 볼 수 있습니다.<br>기록이 있는 날은 색으로 표시됩니다.</div>';
  }
}

/* ---- 묵상 내용만 골라서 카카오톡 등으로 공유 ---- */
let selectMode = false, selectedDates = new Set();
function toggleSelectMode(){
  selectMode = !selectMode;
  selectedDates.clear();
  document.getElementById('selToggle').textContent = selectMode ? '선택 취소' : '여러 날짜 골라 카카오톡으로 공유';
  document.getElementById('selBar').classList.toggle('on', selectMode);
  document.getElementById('selCount').textContent = '0일 선택됨';
  renderCal();
}
function toggleDate(ds){
  if(selectedDates.has(ds)) selectedDates.delete(ds); else selectedDates.add(ds);
  document.getElementById('selCount').textContent = selectedDates.size+'일 선택됨';
  renderCal();
}
function composeShareText(dates){
  const sorted = Array.from(dates).sort();
  const chunks = [];
  sorted.forEach(ds => {
    const r = myQT(ds);
    if(!r || !r.reflection || !r.reflection.trim()) return;
    const s = daySchedule(ds), ov = adminOverrides[ds] || {};
    const ref = expand(ov.dawn || s.dawn) || expand(ov.read || s.read) || '';
    chunks.push(korDate(ds) + (ref ? ' · '+ref : '') + '\n' + r.reflection.trim());
  });
  if(!chunks.length) return '';
  return '🕊 나의 QT 묵상\n\n' + chunks.join('\n\n────────\n\n');
}
async function shareSelected(){
  if(!selectedDates.size){ toast('날짜를 먼저 선택해주세요'); return; }
  const text = composeShareText(selectedDates);
  if(!text){ toast('선택한 날짜에 작성된 묵상이 없습니다'); return; }
  if(navigator.share){
    try{ await navigator.share({ title:'나의 QT 묵상', text }); toggleSelectMode(); return; }
    catch(e){ if(e && e.name === 'AbortError') return; }   // 공유 취소는 그대로 둔다
  }
  try{
    await navigator.clipboard.writeText(text);
    toast('복사했습니다. 카카오톡 대화방에 붙여넣어주세요');
    toggleSelectMode();
  }catch(e){
    toast('공유를 지원하지 않는 브라우저입니다');
  }
}

/* ══════════ 초대 링크 ══════════ */
const SITE_URL = 'https://claude.ai/artifact/TjTRQMDxcAi1gMxPhbHxK9';
async function inviteFriends(){
  const text = '우리교회 QT 사이트에 초대합니다 🕊\n매일 말씀 읽고 묵상을 나눠요.\n\n'+SITE_URL;
  if(navigator.share){
    try{ await navigator.share({ title:'우리교회 QT', text, url:SITE_URL }); return; }
    catch(e){ if(e && e.name === 'AbortError') return; }
  }
  try{
    await navigator.clipboard.writeText(text);
    toast('초대 링크를 복사했습니다 · 카카오톡에 붙여넣어주세요');
  }catch(e){
    toast('이 브라우저에서는 복사를 지원하지 않습니다');
  }
}
function showLog(ds){
  const r = myQT(ds), s = daySchedule(ds), box = document.getElementById('logDetail');
  if(!r){
    box.innerHTML = '<div class="post"><div class="post-ref">'+korDate(ds)+'</div>'+
      '<div style="color:var(--faint);font-size:14.5px;margin:6px 0 14px">이 날은 기록이 없습니다.</div>'+
      (ds <= todayStr() ? '<button class="act" onclick="openQT(\''+ds+'\')">지금 작성하기</button>' : '')+'</div>';
    return;
  }
  const lab = {PRIVATE:'비공개', COMPLETION_ONLY:'완료만 공유', CONTENT:'내용 공유'}[r.share] || '비공개';
  box.innerHTML = '<div class="post"><div class="post-ref">'+korDate(ds)+' · '+esc(expand(s.dawn) || '—')+'</div>'+
    '<div class="post-body">'+esc(r.reflection || '(묵상 없음)')+'</div>'+
    (r.prayer ? '<div class="post-ref" style="margin-top:14px">기도제목</div><div class="post-body">'+esc(r.prayer)+'</div>' : '')+
    '<div class="post-acts"><span class="act">'+(r.completed?'✓ 완료':'작성 중')+'</span><span class="act">'+lab+'</span>'+
    '<button class="act" onclick="openQT(\''+ds+'\')">수정</button></div></div>';
}

/* ══════════ 마이페이지 ══════════ */
function renderMy(){
  document.getElementById('myAva').textContent = me ? me.nick.slice(0,1) : '?';
  document.getElementById('myName').textContent = me ? me.name : '손님';
  document.getElementById('mySub').textContent = me ? '별명 · '+me.nick : '로그인하면 QT를 기록할 수 있습니다';
  document.getElementById('authMenuLabel').textContent = me ? '계정 정보' : '로그인 / 회원가입';
  document.getElementById('adminMenuBtn').style.display = (me && me.isAdmin) ? 'flex' : 'none';
  refreshAiDraftUI();

  const all = allMyQT(), t = new Date();
  const sun = new Date(t); sun.setDate(t.getDate() - t.getDay());
  let h = '';
  for(let i=0;i<7;i++){
    const d = new Date(sun); d.setDate(sun.getDate()+i);
    const r = all[ymd(d)];
    h += '<div class="wd"><span>'+DOW[i]+'</span><i class="'+(r&&r.completed?'on':'')+'">'+(r&&r.completed?'✓':'·')+'</i></div>';
  }
  document.getElementById('weekDots').innerHTML = h;

  const mm = todayStr().slice(0,7);
  const done = Object.keys(all).filter(d => d.startsWith(mm) && all[d] && all[d].completed).length;
  const elapsed = t.getDate();
  document.getElementById('myMonth').textContent = done+' / '+elapsed;
  document.getElementById('myRate').textContent = Math.round(done/elapsed*100)+'%';
  let streak = 0, cur = todayStr(), guard = 0;
  while(guard++ < 400){
    if(isSunday(cur)){ cur = addDays(cur,-1); continue; }   // 주일은 건너뛰고 계속 센다
    if(all[cur] && all[cur].completed){ streak++; cur = addDays(cur,-1); }
    else break;
  }
  document.getElementById('myStreak').textContent = streak+'일';

  paintBadges();
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
  if(next) document.documentElement.setAttribute('data-theme', next);
  else document.documentElement.removeAttribute('data-theme');
  LS.set('theme', next);
  document.getElementById('themeLabel').textContent = next === 'dark' ? '어둡게' : next === 'light' ? '밝게' : '시스템';
}

/* ══════════ 시트 ══════════ */
function openSheet(id){
  document.getElementById(id).classList.add('on');
  if(id === 'sheet-admin'){
    const el = document.getElementById('adDate');
    if(!el.value) el.value = todayStr();
    loadAdmin();
    const nz = adminOverrides['notice'] || {};
    document.getElementById('adNotice').value = nz.text || '';
    document.getElementById('adNoticeFrom').value = toLocalInput(nz.from);
    document.getElementById('adNoticeTo').value = toLocalInput(nz.to);
    refreshAiDraftUI();
    ensureMembersWatch(); renderMembers();
  }
}
function closeSheet(){ document.querySelectorAll('.sheet').forEach(s => s.classList.remove('on')); }

/* ══════════ 인증 (간이) ══════════ */
let authTab = 'signup';
function authMode(m){
  authTab = m;
  document.getElementById('tabSignup').classList.toggle('on', m==='signup');
  document.getElementById('tabLogin').classList.toggle('on', m==='login');
  document.getElementById('auName').style.display = m==='signup' ? 'block' : 'none';
  document.getElementById('auGo').textContent = m==='signup' ? '가입 신청하기' : '로그인';
  document.getElementById('auErr').textContent = '';
}
async function sha(s){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function doAuth(){
  const err = document.getElementById('auErr');
  const name = document.getElementById('auName').value.trim();
  const nick = document.getElementById('auNick').value.trim();
  const pin  = document.getElementById('auPin').value.trim();
  err.textContent = '';
  if(authTab==='signup' && !name){ err.textContent = '이름을 입력해주세요.'; return; }
  if(!nick){ err.textContent = '별명을 입력해주세요.'; return; }
  if(!/^\d{4}$/.test(pin)){ err.textContent = '비밀번호는 숫자 4자리입니다.'; return; }
  if(!DB){ err.textContent = '서버에 연결 중입니다. 잠시 뒤 다시 시도해주세요.'; return; }

  const uid = 'u' + (await sha('nick:'+nick)).slice(0,20);
  const hash = await sha(nick+'|'+pin);
  const ref = DB.doc('members/'+uid);
  let snap;
  try{ snap = await ref.get(); }catch(e){ err.textContent = '연결에 문제가 있습니다. 잠시 뒤 다시 시도해주세요.'; return; }

  if(authTab === 'signup'){
    if(snap.exists){ err.textContent = '이미 사용 중인 별명입니다. 로그인을 눌러주세요.'; return; }
    /* 최초 관리자 지정: 관리자가 한 명도 없을 때만 ADMIN_NICK 가입이 첫 관리자가 된다.
       그 이후의 관리자 권한은 별명이 아니라 members 문서의 admin 값으로만 정해진다. */
    let first = false;
    if(nick === ADMIN_NICK){
      try{ first = (await DB.collection('members').where('admin','==',true).limit(1).get()).empty; }catch(e){}
    }
    const rec = { nick, name, hash, at: Date.now(), status: first ? 'approved' : 'pending', admin: first };
    try{ await ref.set(rec); }
    catch(e){ err.textContent = '가입에 실패했습니다. 잠시 뒤 다시 시도해주세요.'; return; }
    if(!first){
      document.getElementById('auPin').value = '';
      authMode('login');
      document.getElementById('auErr').textContent = '가입 신청이 접수되었습니다. 관리자가 승인하면 로그인할 수 있습니다.';
      return;
    }
    me = { uid, name, nick, isAdmin: true };
  }else{
    if(!snap.exists){ err.textContent = '등록되지 않은 별명입니다. 회원가입을 눌러주세요.'; return; }
    const d = snap.data();
    if(d.hash !== hash){ err.textContent = '비밀번호가 맞지 않습니다.'; return; }
    const st = memberStatus(d);
    if(st === 'pending'){ err.textContent = '관리자의 승인을 기다리고 있습니다. 승인 후 로그인할 수 있습니다.'; return; }
    if(st === 'rejected'){ err.textContent = '가입이 승인되지 않았습니다. 관리자에게 문의해주세요.'; return; }
    me = { uid, name: d.name || nick, nick, isAdmin: d.admin === true };
  }
  LS.set('me', me);
  afterAuth();
}
/* 예전에 가입한 회원(status 값 없음)은 승인된 것으로 본다 */
function memberStatus(d){ return d.status || 'approved'; }
/* 저장된 로그인 정보를 서버 값과 맞춘다: 승인 취소·권한 변경이 바로 반영된다 */
async function refreshMe(){
  if(!me || !DB) return;
  try{
    const snap = await DB.doc('members/'+me.uid).get();
    if(!snap.exists || memberStatus(snap.data()) !== 'approved'){
      me = null; LS.del('me'); renderMy(); renderHome(); toast('계정이 승인 상태가 아닙니다. 다시 로그인해주세요');
      return;
    }
    const d = snap.data(), adm = d.admin === true;
    if(adm !== me.isAdmin || (d.name && d.name !== me.name)){
      me.isAdmin = adm; if(d.name) me.name = d.name; LS.set('me', me);
    }
    renderMy(); ensureMembersWatch();
  }catch(e){}
}
/* ══════════ 회원 관리 (관리자) ══════════ */
let MEMBERS = {}, MEM_WATCH = false;
function ensureMembersWatch(){
  if(MEM_WATCH || !DB || !me || !me.isAdmin) return;
  MEM_WATCH = true;
  DB.collection('members').where('at','>',0).limit(500).onSnapshot(snap => {
    MEMBERS = {};
    snap.docs.forEach(doc => { MEMBERS[doc.id] = doc.data(); });
    renderMembers();
  }, () => { MEM_WATCH = false; });
}
function renderMembers(){
  const box = document.getElementById('memList'); if(!box) return;
  const list = Object.keys(MEMBERS).map(id => Object.assign({id}, MEMBERS[id]));
  const rank = {pending:0, approved:1, rejected:2};
  list.sort((x,y) => rank[memberStatus(x)] - rank[memberStatus(y)] || (y.at||0) - (x.at||0));
  const pend = list.filter(m => memberStatus(m) === 'pending').length;
  const sum = document.getElementById('memSummary');
  if(sum) sum.textContent = '전체 ' + list.length + '명 · 승인 대기 ' + pend + '명';
  const btn = document.getElementById('adminMenuBtn');
  if(btn){ const sp = btn.querySelector('span'); if(sp) sp.textContent = pend ? '승인 대기 ' + pend + '명' : '일정 · 본문 · 설명 · 회원'; }
  const label = {pending:'승인 대기', approved:'승인됨', rejected:'거절됨'};
  box.innerHTML = list.map(m => {
    const st = memberStatus(m), self = me && m.id === me.uid;
    const b = (txt, fn, ghost) => '<button class="chip" style="cursor:pointer;border:1px solid var(--line)" onclick="'+fn+'(\''+m.id+'\')">'+txt+'</button>';
    let acts = '';
    if(st === 'pending') acts = b('승인','memApprove') + b('거절','memReject');
    else if(st === 'approved' && !self) acts = (m.admin === true ? b('관리자 해제','memToggleAdmin') : b('관리자 지정','memToggleAdmin')) + b('승인 취소','memReject');
    else if(st === 'rejected') acts = b('승인','memApprove');
    return '<div style="padding:11px 0;border-top:1px solid var(--line)">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' +
      '<div><b>'+esc(m.name||m.nick)+'</b> <span style="color:var(--sub);font-size:13px">'+esc(m.nick)+(self?' (나)':'')+'</span></div>' +
      '<span style="font-size:12px;color:var(--faint)">'+label[st]+(m.admin===true?' · 관리자':'')+'</span></div>' +
      (acts ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+acts+'</div>' : '') + '</div>';
  }).join('') || '<div style="color:var(--faint);font-size:13.5px">아직 회원이 없습니다.</div>';
}
async function setMember(id, patch){
  if(!me || !me.isAdmin){ toast('관리자만 할 수 있습니다'); return; }
  const ok = await writeDoc('members/'+id, Object.assign({ decidedAt: Date.now(), decidedBy: me.uid }, patch));
  if(!ok) toast('저장에 실패했습니다');
}
function memApprove(id){ setMember(id, { status:'approved' }); }
function memReject(id){
  if(!confirm('이 회원의 접근을 막고 관리자 권한도 해제할까요?')) return;
  setMember(id, { status:'rejected', admin:false });
}
function memToggleAdmin(id){
  const m = MEMBERS[id]; if(!m) return;
  if(id === me.uid){ toast('본인의 권한은 바꿀 수 없습니다'); return; }
  setMember(id, { admin: m.admin !== true });
}
function afterAuth(){
  closeSheet();
  document.getElementById('auPin').value = '';
  toast(me.name+'님, 환영합니다');
  renderMy(); renderHome(); ensureMembersWatch();
}
function doLogout(){
  if(!me){ toast('로그인되어 있지 않습니다'); return; }
  if(!confirm('로그아웃하시겠어요? 이 기기에 저장된 묵상 기록은 다시 로그인하면 볼 수 있습니다.')) return;
  me = null; LS.del('me');
  renderMy(); renderHome(); toast('로그아웃되었습니다');
}

/* ══════════ 관리자 ══════════ */
function loadAdmin(){
  const d = document.getElementById('adDate').value || todayStr();
  const s = daySchedule(d), ov = adminOverrides[d] || {};
  document.getElementById('adRead').value = ov.read || s.read || '';
  document.getElementById('adDawn').value = ov.dawn || s.dawn || '';
  document.getElementById('adText').value = ov.text || '';
  document.getElementById('adExp').value  = ov.exp  || '';
  document.getElementById('adVerse').value = ov.verse || s.verse || '';
  document.getElementById('adErr').textContent = '';
}
/* ══════════ AI 초안 (sample 기능) ══════════ */
let SAMPLE = null;          // claude.use('sample') 결과 — null이면 기능 숨김
let aiAbort = null;
async function initSample(){
  try{
    if(window.claude && typeof window.claude.use === 'function') SAMPLE = await window.claude.use('sample');
  }catch(e){ SAMPLE = null; }
  refreshAiDraftUI();
}
function refreshAiDraftUI(){
  const btn = document.getElementById('aiDraftBtn');
  if(!btn) return;
  btn.style.display = (SAMPLE && me && me.isAdmin) ? 'block' : 'none';
}
function currentWeekDates(){
  const wk = daySchedule(todayStr()).week || todayStr();
  const out = []; let d = wk;
  for(let i=0;i<6;i++){ out.push(d); d = addDays(d,1); }
  return out;
}
function stopWeeklyDraft(){ if(aiAbort) aiAbort.abort(); }
async function generateWeeklyDraft(){
  if(!SAMPLE){ toast('이 화면에서는 AI 초안 기능을 쓸 수 없습니다'); return; }
  const btn = document.getElementById('aiDraftBtn'), stopBtn = document.getElementById('aiStopBtn'),
        status = document.getElementById('aiDraftStatus'), ta = document.getElementById('adBatch');
  if(ta.value.trim() && !confirm('입력칸에 이미 내용이 있습니다. AI 초안으로 덮어쓸까요?')) return;
  btn.disabled = true; stopBtn.style.display = 'block';
  status.textContent = '이번 주 본문을 정리하는 중…';

  const dates = currentWeekDates();
  const dayBlocks = [];
  for(const ds of dates){
    const s = daySchedule(ds), ov = adminOverrides[ds] || {};
    const read = ov.read || s.read, dawn = ov.dawn || s.dawn;
    if(!dawn){ dayBlocks.push('['+ds+'] (새벽본문 없음 — 이 날짜는 건너뛰세요)'); continue; }
    const dawnVs = await getPassage(dawn);
    const dawnText = dawnVs ? versesToText(dawnVs, dawn) : '(본문을 불러오지 못했습니다: '+dawn+')';
    let readHead = '';
    if(read){
      const heads = headingsOf(await getPassage(read), 6);
      if(heads.length) readHead = '넓은 읽기 범위의 소제목 흐름: ' + heads.join(' → ') + '\n';
    }
    dayBlocks.push('['+ds+']\n리딩지저스 범위: '+(read ? expand(read) : '없음 (이 주는 새벽본문만 있음)')+'\n'+
      readHead + '새벽본문('+expand(dawn)+') 전문:\n'+dawnText);
  }

  const prompt =
'당신은 한국 장로교 교회의 QT(경건의 시간) 웹사이트에 올릴 설명을 쓰는 편집자입니다.\n'+
'아래는 이번 주 새벽본문 자료입니다. 각 날짜마다, 그 날 새벽본문에 실제로 나오는 사건·표현·전환을 근거로 삼아 짧은 설명과 질문 두 개를 작성하세요.\n\n'+
'반드시 지킬 것:\n'+
'- 출력은 아래 형식 그대로만. 코드블록, 마크다운 강조(**, #), 여는 말과 닫는 말은 모두 금지.\n'+
'- 각 날짜는 정확히 "[YYYY-MM-DD]" 로 시작합니다.\n'+
'- 그 아래 설명은 3~5문장. 일반론이나 상투적 권면 대신 그 날 본문에서 실제로 벌어지는 일을 근거로 쓰세요. 리딩지저스 범위가 있으면 새벽본문이 그 안에서 어떤 위치인지 한 문장으로 짚으세요.\n'+
'- 다음 줄에 "Q1: " 로 시작하는 질문 — 본문 속 사건이나 인물의 반응에 기반한 관찰 질문.\n'+
'- 다음 줄에 "Q2: " 로 시작하는 질문 — 오늘의 삶에 적용해보는 질문.\n'+
'- 날짜와 날짜 사이는 빈 줄 하나로 구분합니다.\n'+
'- 어제·오늘 본문이 이어지는 흐름(같은 주제나 표현의 반복)이 보이면 자연스럽게 연결해도 좋습니다.\n\n'+
'이번 주 자료:\n\n' + dayBlocks.join('\n\n');

  status.textContent = 'Claude가 작성 중입니다… 처음 글자가 나오기까지 최대 1~2분 걸릴 수 있습니다.';
  aiAbort = new AbortController();
  try{
    const res = await SAMPLE(prompt, {
      modelTier: 'complex',
      cache: false,
      signal: aiAbort.signal,
      onText: u => { status.textContent = '작성 중… ('+u.text.length+'자)'; }
    });
    ta.value = res.text.trim();
    status.textContent = res.truncated
      ? '초안이 길어서 끝부분이 잘렸을 수 있습니다. 확인 후 부족한 날짜는 직접 고쳐주세요.'
      : '초안을 만들었습니다. 내용을 확인하고 고친 뒤 "이번 주 전체 저장"을 눌러주세요.';
    toast('AI 초안이 준비됐습니다');
  }catch(e){
    const map = {
      not_granted:'AI 사용을 허용하지 않으셨습니다. 이 화면에서는 기능이 꺼집니다.',
      sampling_disabled:'이 계정에서는 AI 기능을 사용할 수 없습니다.',
      not_declared:'이 사이트에 AI 기능이 켜져 있지 않습니다.',
      capability_disabled:'지금 화면에서는 AI 기능을 쓸 수 없습니다.',
      capability_removed:'현재 앱 버전에서는 이 기능을 지원하지 않습니다.',
      rate_limited:'요청이 많거나 사용 한도에 도달했습니다. 잠시 뒤 다시 눌러주세요.',
      session_expired:'다시 로그인한 뒤 눌러주세요.',
      refused:'요청이 거절되었습니다. 잠시 뒤 다시 시도해주세요.',
      empty_completion:'응답이 비어 있습니다. 다시 눌러주세요.',
      prompt_too_large:'이번 주 본문 분량이 너무 많아 처리할 수 없습니다.'
    };
    status.textContent = e.code === 'cancelled' ? '중단했습니다.'
      : (map[e.code] || '오류가 발생했습니다 ('+(e.code||'unknown')+'). 다시 눌러주세요.');
    if(e.text && e.code !== 'refused') ta.value = e.text.trim();
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].indexOf(e.code) >= 0)
      btn.style.display = 'none';
  }finally{
    btn.disabled = false; stopBtn.style.display = 'none'; aiAbort = null;
  }
}

/* 이번 주 설명 일괄 입력 — [YYYY-MM-DD]로 시작하는 블록마다 하나씩 저장한다 */
function parseWeeklyBatch(text){
  const blocks = text.split(/\n(?=\s*\[\d{4}-\d{2}-\d{2}\])/).map(b => b.trim()).filter(Boolean);
  const out = [];
  blocks.forEach(b => {
    const m = b.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*\n?([\s\S]*)$/);
    if(!m || !m[2].trim()) return;
    out.push({ date:m[1], exp:m[2].trim() });
  });
  return out;
}
async function saveWeeklyBatch(){
  const err = document.getElementById('batchErr');
  const raw = document.getElementById('adBatch').value;
  const items = parseWeeklyBatch(raw);
  if(!items.length){ err.textContent = '형식을 확인해주세요 — 각 날짜는 [YYYY-MM-DD]로 시작해야 합니다.'; return; }
  let okCount = 0, failDates = [];
  for(const it of items){
    const body = { exp: it.exp, at: Date.now() };
    if(DB){
      const ok = await writeDoc('content/'+it.date, body);
      if(ok){ adminOverrides[it.date] = Object.assign({}, adminOverrides[it.date]||{}, body); okCount++; }
      else failDates.push(it.date);
    }else{
      adminOverrides[it.date] = Object.assign({}, adminOverrides[it.date]||{}, body);
      okCount++;
    }
  }
  err.textContent = failDates.length ? failDates.join(', ')+' 저장 실패 — 편집 권한을 확인해주세요.' : '';
  toast(okCount+'개 날짜를 저장했습니다');
  document.getElementById('adBatch').value = '';
  if(items.some(it => it.date === qtDate)) renderQT();
  renderHome();
}
async function saveAdmin(){
  const d = document.getElementById('adDate').value;
  const err = document.getElementById('adErr');
  if(!d){ err.textContent = '날짜를 선택해주세요.'; return; }
  const body = {
    read: document.getElementById('adRead').value.trim(),
    dawn: document.getElementById('adDawn').value.trim(),
    text: document.getElementById('adText').value.trim(),
    exp:  document.getElementById('adExp').value.trim(),
    verse: document.getElementById('adVerse').value.trim(),
    at: Date.now()
  };
  adminOverrides[d] = body;
  if(DB){
    const ok = await writeDoc('content/'+d, body);
    if(!ok){ err.textContent = '저장에 실패했습니다. 편집 권한이 있는지 확인해주세요.'; return; }
  }
  closeSheet(); toast(korDate(d)+' 콘텐츠를 저장했습니다');
  if(qtDate === d) renderQT();
  renderHome();
}
function toLocalInput(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
async function saveNotice(){
  const err = document.getElementById('noticeErr');
  const text = document.getElementById('adNotice').value.trim();
  const fromV = document.getElementById('adNoticeFrom').value;
  const toV = document.getElementById('adNoticeTo').value;
  if(fromV && toV && fromV > toV){ err.textContent = '종료 시각이 시작 시각보다 빠릅니다.'; return; }
  const body = {
    text,
    from: fromV ? new Date(fromV).getTime() : 0,
    to:   toV ? new Date(toV).getTime() : 0,
    at: Date.now()
  };
  adminOverrides['notice'] = body;
  if(DB){
    const ok = await writeDoc('content/notice', body);
    if(!ok){ err.textContent = '저장에 실패했습니다. 편집 권한이 있는지 확인해주세요.'; return; }
  }
  err.textContent = '';
  toast(text ? (fromV || toV ? '기간 한정 알림을 저장했습니다' : '상시 알림을 저장했습니다') : '알림을 비웠습니다');
  renderHome();
}

/* ══════════ 시작 ══════════ */
/* 저장소 연결과 무관하게 반드시 즉시 실행되어야 하는 것들을
   최상위에 둔다 — 이전 버전에서 파일 선택 버튼이 db 연결 성공
   콜백 안에 갇혀 있어, 연결이 늦거나 실패하면 버튼이 아예 동작하지
   않는 문제가 있었다. */
function connectDB(retries){
  if(window.claude && typeof window.claude.use === 'function'){
    window.claude.use('db').then(db => {
      if(!db) return;
      DB = db;
      refreshMe();
      watchShares(todayStr());
      subscribeShareRange();
      DB.collection('content').where('at','>',0).limit(400).onSnapshot(snap => {
        snap.docs.forEach(doc => { adminOverrides[doc.id] = doc.data(); });
        renderHome(); if(document.getElementById('qt').classList.contains('on')) renderQT();
      }, () => {});
      DB.collection('cheers').where('at','>',0).limit(200).onSnapshot(snap => {
        CHEERS = {};
        snap.docs.forEach(doc => { CHEERS[doc.id] = doc.data(); });
        if(route==='share') paintCheers();
      }, () => {});
      DB.doc('bible/meta').get().then(sn => {
        if(!sn.exists) return;
        const d = sn.data();
        BIB.ver = d.ver || '성경'; BIB.at = d.at || 0; BIB.ready = true;
        const st = document.getElementById('bibleStatus');
        if(st) st.textContent = BIB.ver + ' 본문이 연결되어 있습니다. 새 파일을 올리면 교체됩니다.';
        if(document.getElementById('qt').classList.contains('on')) renderQT();
        if(route === 'bible') renderBible();
      }).catch(() => {});
      renderHome();
    }).catch(() => {});
  } else if(retries > 0){
    setTimeout(() => connectDB(retries-1), 250);   // 모바일에서 주입이 늦는 경우를 대비한 재시도
  }
}
function measureTabbar(){
  const tb = document.getElementById('tabbar');
  if(tb) document.documentElement.style.setProperty('--tabbar-h', tb.offsetHeight + 'px');
}
(function init(){
  const th = LS.get('theme','');
  if(th) document.documentElement.setAttribute('data-theme', th);
  me = LS.get('me', null);
  const bl = LS.get('bibleLocal', null);
  if(bl){ BIB.ver = bl.ver; BIB.at = bl.at; BIB.ready = true; }
  authMode('signup');
  renderHome(); renderMy();
  if(!me) setTimeout(() => openSheet('sheet-auth'), 600);

  const q = LS.get('bibleQueue', null);
  const rb = document.getElementById('resumeBtn');
  if(rb && q && q.parts && q.parts.length) rb.style.display = 'block';

  /* 인앱 브라우저(카카오톡·네이버·페이스북·인스타그램 등)는 파일 선택을 막는 경우가 많다 */
  const ua = navigator.userAgent || '';
  if(/KAKAOTALK|NAVER|Line\/|FBAN|FBAV|Instagram|WhaleAgent\/.*inapp/i.test(ua)){
    const w = document.getElementById('inAppWarn'); if(w) w.classList.add('on');
  }
  const fi = document.getElementById('bibleFile'), fb = document.getElementById('fileBtn');
  if(fb && fi){
    fb.addEventListener('click', () => {
      try{ fi.click(); }
      catch(e){ document.getElementById('bibleErr').textContent = '이 브라우저에서는 파일 선택이 열리지 않습니다. 다른 브라우저로 열어서 시도해주세요.'; }
    });
    fi.addEventListener('change', () => {
      const f = fi.files[0];
      document.getElementById('fileOk').textContent = f ? '선택됨: ' + f.name + ' (' + Math.round(f.size/1024) + 'KB)' : '';
    });
  }

  initSample();
  measureTabbar();
  window.addEventListener('resize', measureTabbar);
  window.addEventListener('orientationchange', () => setTimeout(measureTabbar, 200));
  connectDB(20);

  /* 텍스트 입력 중에는 키보드가 하단 메뉴를 덮지 않도록 잠시 숨긴다 */
  const TYPING_TYPES = ['checkbox','radio','date','file','range','color'];
  function isTypingField(el){
    if(!el) return false;
    if(el.tagName === 'TEXTAREA') return true;
    if(el.tagName === 'INPUT') return !TYPING_TYPES.includes(el.type);
    return false;
  }
  document.addEventListener('focusin', e => {
    if(isTypingField(e.target)) document.getElementById('tabbar').classList.add('kb-hide');
  });
  document.addEventListener('focusout', e => {
    if(!isTypingField(e.target)) return;
    setTimeout(() => {                      // 다음 입력창으로 바로 넘어가는 경우 깜빡임 방지
      if(!isTypingField(document.activeElement)) document.getElementById('tabbar').classList.remove('kb-hide');
    }, 60);
  });
})();
