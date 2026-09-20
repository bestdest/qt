/* ══════════════════════════════════════════════
   배지 · 트로피 · 배지 자랑(나눔)
   ══════════════════════════════════════════════ */
let CHEERS = {};

/* 책 → 완독에 필요한 날짜 목록 (리딩지저스 읽기범위 기준) */
const bookDates = {};
Object.keys(DAYS).forEach(date => {
  const spec = parseRef(DAYS[date].read);
  if(!spec) return;
  const i1 = BOOKS.findIndex(b => b.a === spec.b1), i2 = BOOKS.findIndex(b => b.a === spec.b2);
  if(i1 < 0 || i2 < 0) return;
  for(let i=i1;i<=i2;i++){
    const a = BOOKS[i].a;
    (bookDates[a] = bookDates[a] || []).push(date);
  }
});

const BOOK_BADGES = BOOKS.map((b,i) => ({ id:'book_'+i, icon:'📖', name:b.n+' 완독', desc:b.n+'을 전부 읽고 완료 표시했어요', abbr:b.a }));
const BADGES = [
  { id:'streak7',     icon:'🔥',    name:'7일 연속',      desc:'주일을 빼고 7일 연속 QT를 완료했어요' },
  { id:'streak30',    icon:'🔥🔥',  name:'30일 연속',     desc:'주일을 빼고 30일 연속 QT를 완료했어요' },
  { id:'streak100',   icon:'🔥🔥🔥', name:'100일 연속',    desc:'주일을 빼고 100일 연속 QT를 완료했어요' },
  { id:'dawn10',      icon:'🌄',    name:'새벽지기',       desc:'오전 5시~7시 사이에 QT를 10번 저장했어요' },
  { id:'comeback',    icon:'🌱',    name:'다시 시작',      desc:'3일 이상 쉬었다가 다시 QT를 시작했어요' },
  { id:'firstShare',  icon:'📣',    name:'첫 나눔',        desc:'묵상을 처음으로 공동체와 나눴어요' },
  { id:'firstComment',icon:'💬',    name:'첫 댓글',        desc:'다른 교인의 묵상에 처음으로 댓글을 남겼어요' },
  { id:'prayed10',    icon:'🙏',    name:'기도 응원 10회', desc:'내 묵상에 기도했어요를 10번 받았어요' },
  { id:'otDone',      icon:'📚',    name:'구약 완독',      desc:'구약 39권을 모두 완독했어요' },
  { id:'ntDone',      icon:'📗',    name:'신약 완독',      desc:'신약 27권을 모두 완독했어요' },
  { id:'wholeBible',  icon:'👑',    name:'2026 성경 일독', desc:'리딩지저스 일정을 처음부터 끝까지 완독했어요' }
];
const BADGE_MAP = {};
BADGES.concat(BOOK_BADGES).forEach(b => BADGE_MAP[b.id] = b);
const TROPHY_ICON  = { gold:'🏆', silver:'🥈', bronze:'🥉' };
const TROPHY_LABEL = { gold:'완주', silver:'우수', bronze:'꾸준함' };

/* ---- 계산 ---- */
function maxStreak(all){
  let max=0, cur=0, d=parse(FIRST); const end=parse(todayStr());
  while(d <= end){
    if(d.getDay() !== 0){
      const ds = ymd(d);
      if(all[ds] && all[ds].completed){ cur++; if(cur>max) max=cur; }
      else cur = 0;
    }
    d.setDate(d.getDate()+1);
  }
  return max;
}
function hasComeback(all){
  const dates = Object.keys(all);
  if(!dates.length) return false;
  let start = dates.sort()[0];              // 실제로 활동을 시작한 날부터만 "쉼"으로 센다
  let miss=0, d=parse(start); const end=parse(todayStr());
  while(d <= end){
    if(d.getDay() !== 0){
      const ds = ymd(d), hit = all[ds] && all[ds].completed;
      if(hit){ if(miss>=3) return true; miss=0; } else miss++;
    }
    d.setDate(d.getDate()+1);
  }
  return false;
}
function dawnCount(all){
  let n=0;
  Object.keys(all).forEach(ds => {
    const r = all[ds];
    if(r && r.completed && r.updatedAt){
      const h = new Date(r.updatedAt).getHours();
      if(h>=5 && h<7) n++;
    }
  });
  return n;
}
function totalPrayersReceived(){
  let n=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.indexOf('prayersFor:') === 0) n += LS.get(k, 0);
    }
  }catch(e){}
  return n;
}
function notePrayersForMe(date, entries){
  if(!me || !entries || !entries[me.uid]) return;
  const cnt = Object.values(reactionMap(entries[me.uid], 'pray')).filter(Boolean).length;
  LS.set('prayersFor:'+date, cnt);
}

function earnedBadgeIds(){
  const all = allMyQT();
  const earned = new Set();
  const ms = maxStreak(all);
  if(ms>=7)   earned.add('streak7');
  if(ms>=30)  earned.add('streak30');
  if(ms>=100) earned.add('streak100');
  if(dawnCount(all) >= 10) earned.add('dawn10');
  if(hasComeback(all)) earned.add('comeback');
  if(Object.values(all).some(r => r && r.share && r.share !== 'PRIVATE')) earned.add('firstShare');
  if(LS.get('badge:firstComment', false)) earned.add('firstComment');
  if(totalPrayersReceived() >= 10) earned.add('prayed10');

  let otAll = true, ntAll = true;
  BOOKS.forEach((b,i) => {
    const dates = bookDates[b.a] || [];
    if(!dates.length) return;
    if(dates.every(ds => all[ds] && all[ds].completed)) earned.add('book_'+i);
    else if(i < 39) otAll = false; else ntAll = false;
  });
  if(otAll) earned.add('otDone');
  if(ntAll) earned.add('ntDone');
  if(otAll && ntAll) earned.add('wholeBible');
  return earned;
}

function monthKeysBeforeThisMonth(){
  const keys = []; const curKey = todayStr().slice(0,7);
  const f = parse(FIRST); let d = new Date(f.getFullYear(), f.getMonth(), 1);
  while(true){
    const key = d.getFullYear()+'-'+pad(d.getMonth()+1);
    if(key >= curKey) break;
    keys.push(key);
    d.setMonth(d.getMonth()+1);
  }
  return keys;
}
function computeTrophies(){
  const all = allMyQT();
  const out = {};
  monthKeysBeforeThisMonth().forEach(mk => {
    let total=0, done=0;
    Object.keys(DAYS).forEach(ds => {
      if(ds.slice(0,7) !== mk || !DAYS[ds].read) return;
      total++; if(all[ds] && all[ds].completed) done++;
    });
    if(!total) return;
    const pct = done/total;
    const tier = pct>=1 ? 'gold' : pct>=0.8 ? 'silver' : pct>=0.5 ? 'bronze' : null;
    if(tier) out[mk] = tier;
  });
  return out;
}

/* ---- 새로 딴 배지 감지 + 축하 ---- */
function checkBadges(){
  if(!me) return { newBadges:[], newTrophies:[] };
  const key = 'badges:'+me.uid;
  const stored = LS.get(key, null);
  const earned = earnedBadgeIds();
  const trophies = computeTrophies();

  if(stored === null){
    const rec = { ids:{}, trophies:{} };
    earned.forEach(id => rec.ids[id] = Date.now());
    Object.keys(trophies).forEach(mk => rec.trophies[mk] = trophies[mk]);
    LS.set(key, rec);
    const n = earned.size + Object.keys(trophies).length;
    if(n) toast('배지 '+n+'개를 확인했어요 · 마이페이지에서 보기');
    return { newBadges:[], newTrophies:[] };
  }

  const newBadges = [], newTrophies = [];
  earned.forEach(id => { if(!stored.ids[id]){ stored.ids[id] = Date.now(); newBadges.push(id); } });
  Object.keys(trophies).forEach(mk => {
    if(stored.trophies[mk] !== trophies[mk]){ stored.trophies[mk] = trophies[mk]; newTrophies.push(mk); }
  });
  if(newBadges.length || newTrophies.length) LS.set(key, stored);

  const msgs = newBadges.map(id => BADGE_MAP[id].icon+' '+BADGE_MAP[id].name+' 배지 획득!')
    .concat(newTrophies.map(mk => TROPHY_ICON[trophies[mk]]+' '+mk.replace('-','.')+' 트로피 획득!'));
  if(msgs.length === 1) toast(msgs[0]);
  else if(msgs.length > 1) toast('새 배지 '+msgs.length+'개를 얻었어요! 마이페이지에서 확인해보세요');
  return { newBadges, newTrophies };
}

/* ---- 마이페이지 렌더 ---- */
function paintBadges(){
  const grid = document.getElementById('badgeGrid'), bookGrid = document.getElementById('bookBadgeGrid'),
        strip = document.getElementById('trophyStrip');
  if(!me){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;padding:18px 4px">로그인하면 배지를 모을 수 있어요</div>';
    bookGrid.innerHTML = ''; strip.innerHTML = '';
    return;
  }
  checkBadges();
  const rec = LS.get('badges:'+me.uid, {ids:{},trophies:{}});
  const earned = new Set(Object.keys(rec.ids));

  grid.innerHTML = BADGES.map(b => {
    const on = earned.has(b.id);
    return '<div class="badge'+(on?' on':'')+'" data-id="'+b.id+'" data-on="'+(on?1:0)+'">'+
      '<span class="ic">'+b.icon+'</span><span>'+b.name+'</span></div>';
  }).join('');
  bookGrid.innerHTML = BOOK_BADGES.map(b => {
    const on = earned.has(b.id);
    return '<div class="bbadge'+(on?' on':'')+'" data-id="'+b.id+'" data-on="'+(on?1:0)+'">'+esc(b.abbr)+'</div>';
  }).join('');
  document.querySelectorAll('#badgeGrid .badge, #bookBadgeGrid .bbadge').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      if(el.dataset.on === '1') postCheer(id);
      else toast(BADGE_MAP[id].desc);
    };
  });

  const trophies = Object.entries(rec.trophies||{}).sort((a,b) => b[0].localeCompare(a[0]));
  strip.innerHTML = trophies.length
    ? trophies.map(([mk,tier]) => '<div class="trophy"><span class="ic">'+TROPHY_ICON[tier]+'</span><span>'+mk.replace('-','.')+' · '+TROPHY_LABEL[tier]+'</span></div>').join('')
    : '<div class="empty" style="padding:18px 4px">아직 트로피가 없어요 · 한 달을 꾸준히 채우면 트로피를 받아요</div>';
}

/* ---- 배지 자랑(나눔) ---- */
async function postCheer(id){
  if(!me){ openSheet('sheet-auth'); return; }
  const b = BADGE_MAP[id]; if(!b) return;
  if(!DB){ toast('지금은 자랑 기능을 쓸 수 없습니다'); return; }
  const docId = me.uid+'-'+id;
  if(CHEERS[docId]){ toast('이미 나눔에 자랑했어요 · 나눔 탭에서 확인해보세요'); tabGo('share'); return; }
  const ok = await writeDoc('cheers/'+docId, { uid:me.uid, name:me.nick, icon:b.icon, label:b.name, at:Date.now(), hearts:{} });
  toast(ok ? '나눔에 자랑했어요 🎉' : '자랑하기에 실패했습니다. 잠시 뒤 다시 시도해주세요');
}
async function toggleCheer(docId){
  if(!me){ toast('로그인 후 사용할 수 있습니다'); return; }
  const c = CHEERS[docId];
  const mine = c && c.hearts && c.hearts[me.uid];
  const body = { hearts:{} }; body.hearts[me.uid] = !mine;
  await writeDoc('cheers/'+docId, body);
}
function paintCheers(){
  const wrap = document.getElementById('cheerStrip');
  if(!wrap) return;
  const list = Object.entries(CHEERS).sort((a,b) => (b[1].at||0)-(a[1].at||0)).slice(0,30);
  if(!list.length){ wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = list.map(([id,c]) => {
    const cnt = Object.values(c.hearts||{}).filter(Boolean).length;
    const mineOn = me && c.hearts && c.hearts[me.uid];
    return '<div class="cheer-chip'+(mineOn?' mine':'')+'" data-id="'+id+'"><span class="ic">'+esc(c.icon)+'</span>'+
      '<span><b>'+esc(c.name)+'</b> · '+esc(c.label)+'</span><span class="cnt">🎉'+(cnt||'')+'</span></div>';
  }).join('');
  wrap.querySelectorAll('.cheer-chip').forEach(el => el.onclick = () => toggleCheer(el.dataset.id));
}

