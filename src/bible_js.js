/* ══════════════════════════════════════════════
   성경 본문 저장소 — 교회가 올린 파일을 읽고 보관한다
   ══════════════════════════════════════════════ */
const CHUNK = 55000;              // 한 문서에 담는 글자 수
const BIB = { ver:null, at:0, mem:{}, ready:false };

function lookupBook(s){
  s = (s||'').trim();
  return ABBR[s] || FULL[s] || null;
}

/* ---- IndexedDB (기기 캐시) ---- */
function idbOpen(){
  return new Promise(res => {
    try{
      const r = indexedDB.open('qt-bible', 1);
      r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains('b')) r.result.createObjectStore('b'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    }catch(e){ res(null); }
  });
}
async function idbGet(k){
  const db = await idbOpen(); if(!db) return null;
  return new Promise(res => {
    try{ const q = db.transaction('b').objectStore('b').get(k);
      q.onsuccess = () => res(q.result || null); q.onerror = () => res(null);
    }catch(e){ res(null); }
  });
}
async function idbSet(k, v){
  const db = await idbOpen(); if(!db) return;
  try{ db.transaction('b','readwrite').objectStore('b').put(v, k); }catch(e){}
}

/* ---- 파싱: "창1:1 <소제목> 본문" 형식 ---- */
function parseBibleText(text, onProgress){
  const lines = text.split(/\r?\n/);
  const books = {};
  let lastB = null, lastC = 0, lastV = 0, pend = '';
  for(let i=0;i<lines.length;i++){
    const line = lines[i].trim();
    if(!line) continue;
    let m = line.match(/^([가-힣]{1,2})(\d+):(\d+)(?:-\d+)?\s+(.*)$/);
    if(m){
      const b = m[1], c = +m[2], v = +m[3];
      if(!ABBR[b]) continue;
      let rest = m[4], carry = null;
      /* 책이 바뀌는 자리에서 두 절이 한 줄에 붙어 있는 경우를 떼어낸다 */
      const re = /1:1\s/g; let mm;
      while((mm = re.exec(rest))){
        if(mm.index < 1) continue;
        const two = rest.slice(mm.index-2, mm.index), one = rest.slice(mm.index-1, mm.index);
        const hit = (ABBR[two] && two !== b) ? two : (ABBR[one] && one !== b) ? one : null;
        if(hit){
          carry = { b:hit, rest: rest.slice(mm.index + 4) };
          rest = rest.slice(0, mm.index - hit.length);
          break;
        }
      }
      const titles = (rest.match(/<[^>]*>/g) || []).map(t => t.slice(1,-1).trim());
      const body = rest.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
      const t = (pend ? [pend] : []).concat(titles).filter(Boolean).join(' / ');
      pend = '';
      (books[b] = books[b] || {})[c+':'+v] = { t, x: body };
      lastB = b; lastC = c; lastV = v;
      if(carry){
        const ct = (carry.rest.match(/<[^>]*>/g) || []).map(x => x.slice(1,-1).trim());
        const cb = carry.rest.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
        (books[carry.b] = books[carry.b] || {})['1:1'] = { t: ct.join(' / '), x: cb };
        lastB = carry.b; lastC = 1; lastV = 1;
      }
    }else{
      // 절 번호가 빠진 줄 — 앞 절의 이어짐으로 처리한다
      const m2 = line.match(/^([가-힣]{1,2})(\d+):\s*(.*)$/);
      if(!m2 || !ABBR[m2[1]]) continue;
      const b = m2[1], c = +m2[2];
      const titles = (m2[3].match(/<[^>]*>/g) || []).map(t => t.slice(1,-1).trim());
      const body = m2[3].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
      const key = c+':'+lastV;
      if(b === lastB && books[b] && books[b][key]){
        books[b][key].x += ' ' + body;
        if(titles.length) pend = titles.join(' / ');
      }else{
        (books[b] = books[b] || {})[c+':1'] = { t: titles.join(' / '), x: body };
        lastB = b; lastC = c; lastV = 1;
      }
    }
    if(onProgress && i % 4000 === 0) onProgress(i / lines.length);
  }
  return books;
}

/* ---- 직렬화: "c:v\t소제목\t본문" 줄 묶음 ---- */
function serializeBook(map){
  const keys = Object.keys(map).sort((a,b) => {
    const [ac,av] = a.split(':').map(Number), [bc,bv] = b.split(':').map(Number);
    return ac - bc || av - bv;
  });
  return keys.map(k => k + '\t' + (map[k].t || '') + '\t' + map[k].x).join('\n');
}
function deserializeBook(blob){
  const map = {};
  blob.split('\n').forEach(line => {
    if(!line) return;
    const i = line.indexOf('\t'); if(i < 0) return;
    const j = line.indexOf('\t', i+1);
    map[line.slice(0,i)] = { t: line.slice(i+1, j < 0 ? undefined : j), x: j < 0 ? '' : line.slice(j+1) };
  });
  return map;
}
function chunkBlob(blob){
  const out = [];
  for(let i=0;i<blob.length;i+=CHUNK){
    let end = Math.min(i+CHUNK, blob.length);
    if(end < blob.length){
      const nl = blob.lastIndexOf('\n', end);
      if(nl > i) end = nl;
    }
    out.push(blob.slice(i, end));
    i = end - CHUNK;
  }
  return out;
}

/* ---- 업로드 ---- */
/* 문서 아이디는 반드시 ASCII 여야 한다 (경로 세그먼트 제약). 책은 번호로 쓴다. */
const bookIdx = {}; BOOKS.forEach((b,i) => { bookIdx[b.a] = i; });
const partId = (abbr, n) => 'b' + bookIdx[abbr] + '-' + n;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function setDocRetry(path, body){
  let wait = 700;
  for(let tryN = 0; tryN < 4; tryN++){
    try{ await DB.doc(path).set(body); return null; }
    catch(err){
      const code = (err && err.code) || 'unknown';
      if(code === 'resource_exhausted' || code === 'unavailable'){
        await sleep(wait); wait *= 2; continue;
      }
      return code;                       // 고쳐야 하는 오류 — 재시도해도 소용없다
    }
  }
  return 'resource_exhausted';
}

async function importBible(){
  const f = document.getElementById('bibleFile').files[0];
  const err = document.getElementById('bibleErr');
  const wrap = document.getElementById('bibleProgWrap'), bar = document.getElementById('bibleProg');
  const st = document.getElementById('bibleStatus');
  err.textContent = '';
  if(!f){ err.textContent = '먼저 텍스트 파일을 선택해주세요.'; return; }
  const ver = (document.getElementById('bibleVer').value || '').trim() || '성경';

  wrap.classList.add('on'); bar.style.width = '2%';
  st.textContent = '파일을 읽는 중입니다…';

  let raw;
  try{
    const buf = await f.arrayBuffer();
    try{ raw = new TextDecoder('utf-8', {fatal:true}).decode(buf); }
    catch(e){ raw = new TextDecoder('euc-kr').decode(buf); }
  }catch(e){
    err.textContent = '파일을 읽지 못했습니다. UTF-8 또는 EUC-KR 텍스트 파일인지 확인해주세요.';
    wrap.classList.remove('on'); return;
  }

  st.textContent = '본문을 분석하는 중입니다…';
  await sleep(20);
  const books = parseBibleText(raw, p => { bar.style.width = (2 + p*18) + '%'; });
  const names = Object.keys(books).filter(b => bookIdx[b] !== undefined);
  if(!names.length){
    err.textContent = '성경 형식을 찾지 못했습니다. "창1:1 본문" 형식의 텍스트인지 확인해주세요.';
    wrap.classList.remove('on'); return;
  }

  /* ① 먼저 이 기기에 저장한다 — 저장소 연결과 무관하게 바로 쓸 수 있게 */
  const at = Date.now();
  const parts = [];
  for(const b of names){
    const chunks = chunkBlob(serializeBook(books[b]));
    await idbSet('bk:'+b, chunks.join('\n'));
    chunks.forEach((d, i) => parts.push({ id: partId(b, i), b, d }));
    BIB.mem[b] = books[b];
  }
  BIB.ver = ver; BIB.at = at; BIB.ready = true;
  LS.set('bibleLocal', { ver, at, n: names.length });
  bar.style.width = '24%';
  st.textContent = ver + ' · ' + names.length + '권을 이 기기에 저장했습니다. 이제 교회 저장소로 올립니다…';
  if(document.getElementById('qt').classList.contains('on')) renderQT();
  if(route === 'bible') renderBible();

  /* ② 교회 저장소로 올린다 — 실패해도 위 결과는 남는다 */
  if(!DB){
    st.textContent = ver + ' 본문이 이 기기에서 작동합니다. 다만 교회 저장소에 연결되지 않아 다른 교인에게는 아직 보이지 않습니다.';
    wrap.classList.remove('on'); return;
  }
  await uploadParts(parts, ver, at, bar, st, err);
}

async function uploadParts(parts, ver, at, bar, st, err){
  LS.set('bibleQueue', { ver, at, parts });
  for(let i=0;i<parts.length;i++){
    const code = await setDocRetry('bible/'+parts[i].id, { b: parts[i].b, d: parts[i].d, ver, at });
    if(code){
      LS.set('bibleQueue', { ver, at, parts: parts.slice(i) });
      err.textContent = (i+1) + '번째 묶음에서 멈췄습니다 (' + code + '). ' +
        (code === 'resource_exhausted' ? '잠시 뒤 “이어서 올리기”를 눌러주세요.'
         : code === 'quota_exceeded' ? '저장소 문서 수가 가득 찼습니다.'
         : '편집 권한이 있는 계정인지 확인해주세요.');
      document.getElementById('resumeBtn').style.display = 'block';
      st.textContent = '이 기기에서는 정상 작동합니다. 남은 ' + (parts.length - i) + '개 묶음만 다시 올리면 됩니다.';
      return;
    }
    bar.style.width = (24 + (i+1)/parts.length*74) + '%';
    st.textContent = '교회 저장소로 올리는 중… ' + (i+1) + ' / ' + parts.length;
    await sleep(140);                    // 호출 속도 제한을 피한다
  }
  const code = await setDocRetry('bible/meta', { ver, at, parts: parts.length });
  LS.del('bibleQueue');
  bar.style.width = '100%';
  document.getElementById('resumeBtn').style.display = 'none';
  st.textContent = code
    ? '본문은 올라갔지만 마무리 표시에 실패했습니다 (' + code + '). 한 번 더 시도해주세요.'
    : ver + ' 본문이 교회 저장소에 올라갔습니다. 이제 모든 교인 화면에 본문이 보입니다.';
  toast('성경 본문을 올렸습니다');
}

async function resumeUpload(){
  const q = LS.get('bibleQueue', null);
  const err = document.getElementById('bibleErr'), st = document.getElementById('bibleStatus');
  const wrap = document.getElementById('bibleProgWrap'), bar = document.getElementById('bibleProg');
  err.textContent = '';
  if(!q || !q.parts || !q.parts.length){ err.textContent = '이어서 올릴 내용이 없습니다.'; return; }
  if(!DB){ err.textContent = '교회 저장소에 연결되어 있지 않습니다.'; return; }
  wrap.classList.add('on');
  await uploadParts(q.parts, q.ver, q.at, bar, st, err);
}

/* ---- 읽기 ---- */
async function getBook(abbr){
  if(BIB.mem[abbr]) return BIB.mem[abbr];
  if(!BIB.ready) return null;
  const local = await idbGet('bk:'+abbr);
  if(local){ BIB.mem[abbr] = deserializeBook(local); return BIB.mem[abbr]; }
  if(!DB || bookIdx[abbr] === undefined) return null;
  try{
    const snap = await DB.collection('bible').where('b','==',abbr).get();
    if(!snap.size) return null;
    const blob = snap.docs
      .map(d => ({ n: +(d.id.split('-')[1] || 0), d: d.data().d || '' }))
      .sort((a,b) => a.n - b.n).map(o => o.d).join('\n');
    idbSet('bk:'+abbr, blob);
    BIB.mem[abbr] = deserializeBook(blob);
    return BIB.mem[abbr];
  }catch(e){ return null; }
}

/* 참조 문자열 → {b1,c1,v1,b2,c2,v2}  (v 가 null 이면 장 전체) */
function parseRef(ref){
  if(!ref) return null;
  const s = ref.trim();
  let m;
  // 전 11:9-12:8
  if((m = s.match(/^([가-힣]{1,3})\s*(\d+):(\d+)\s*-\s*(\d+):(\d+)$/)) && lookupBook(m[1])){
    const b = lookupBook(m[1]).a;
    return { b1:b, c1:+m[2], v1:+m[3], b2:b, c2:+m[4], v2:+m[5] };
  }
  // 창 3:1-13 / 창 3:1
  if((m = s.match(/^([가-힣]{1,3})\s*(\d+):(\d+)(?:\s*-\s*(\d+))?$/)) && lookupBook(m[1])){
    const b = lookupBook(m[1]).a;
    return { b1:b, c1:+m[2], v1:+m[3], b2:b, c2:+m[2], v2: m[4] ? +m[4] : +m[3] };
  }
  // 옵 1-욘 4
  if((m = s.match(/^([가-힣]{1,3})\s*(\d+)\s*-\s*([가-힣]{1,3})\s*(\d+)$/)) && lookupBook(m[1]) && lookupBook(m[3])){
    return { b1:lookupBook(m[1]).a, c1:+m[2], v1:null, b2:lookupBook(m[3]).a, c2:+m[4], v2:null };
  }
  // 창 1-4
  if((m = s.match(/^([가-힣]{1,3})\s*(\d+)\s*-\s*(\d+)$/)) && lookupBook(m[1])){
    const b = lookupBook(m[1]).a;
    return { b1:b, c1:+m[2], v1:null, b2:b, c2:+m[3], v2:null };
  }
  // 딛-몬
  if((m = s.match(/^([가-힣]{1,4})\s*-\s*([가-힣]{1,4})$/)) && lookupBook(m[1]) && lookupBook(m[2])){
    const a = lookupBook(m[1]), z = lookupBook(m[2]);
    return { b1:a.a, c1:1, v1:null, b2:z.a, c2:z.c, v2:null };
  }
  // 유다서 / 창 3
  if((m = s.match(/^([가-힣]{1,4})(?:\s*(\d+))?$/)) && lookupBook(m[1])){
    const a = lookupBook(m[1]);
    return m[2] ? { b1:a.a, c1:+m[2], v1:null, b2:a.a, c2:+m[2], v2:null }
                : { b1:a.a, c1:1, v1:null, b2:a.a, c2:a.c, v2:null };
  }
  return null;
}

/* 참조 → 절 배열 [{b,c,v,t,x}] */
async function getPassage(ref){
  const spec = parseRef(ref);
  if(!spec || !BIB.ready) return null;
  const i1 = BOOKS.findIndex(b => b.a === spec.b1), i2 = BOOKS.findIndex(b => b.a === spec.b2);
  if(i1 < 0 || i2 < 0 || i2 < i1) return null;
  const out = [];
  for(let i=i1;i<=i2;i++){
    const meta = BOOKS[i], map = await getBook(meta.a);
    if(!map) continue;
    const from = i === i1 ? spec.c1 : 1;
    const to   = i === i2 ? spec.c2 : meta.c;
    for(let c=from;c<=to;c++){
      for(let v=1;v<=200;v++){
        if(i === i2 && c === spec.c2 && spec.v2 && v > spec.v2) break;
        const o = map[c+':'+v];
        if(!o) continue;                       // 절이 합쳐진 판본을 건너뛴다
        if(i === i1 && c === spec.c1 && spec.v1 && v < spec.v1) continue;
        out.push({ b: meta.a, bn: meta.n, c, v, t: o.t, x: o.x });
      }
    }
  }
  return out.length ? out : null;
}

/* 절 배열 → HTML */
function paintVerses(el, verses, ref, fallbackNote){
  el.innerHTML = '';
  if(!verses){
    el.innerHTML = '<div class="note">' + esc(fallbackNote) + '</div>';
    el.dataset.copyText = '';
    return;
  }
  let lastCh = null, html = '';
  verses.forEach(o => {
    const chKey = o.b + o.c;
    if(chKey !== lastCh){ html += '<span class="ch">' + esc(o.bn + ' ' + o.c + '장') + '</span>'; lastCh = chKey; }
    if(o.t) html += '<span class="ti">' + esc(o.t) + '</span>';
    html += '<p><span class="vn">' + o.v + '</span>' + esc(o.x) + '</p>';
  });
  el.innerHTML = html;
  el.dataset.copyText = versesToText(verses, ref);
}
function versesToText(verses, ref){
  if(!verses || !verses.length) return '';
  let out = ref ? expand(ref) + '\n' : '';
  let lastCh = null;
  verses.forEach(o => {
    const chKey = o.b + o.c;
    if(chKey !== lastCh){ out += (out.trim() ? '\n' : '') + o.bn + ' ' + o.c + '장\n'; lastCh = chKey; }
    out += o.v + '. ' + o.x + '\n';
  });
  return out.trim();
}
/* 길게 누르면 화면에 표시된 본문 전체를 복사한다 (스크롤은 그대로 동작) */
function attachLongPressCopy(el){
  if(!el || el.dataset.lpBound) return;
  el.dataset.lpBound = '1';
  const THRESH = 10, HOLD = 550;
  let timer = null, sx = 0, sy = 0, moved = false;
  const begin = (x,y) => {
    moved = false; sx = x; sy = y;
    timer = setTimeout(doCopy, HOLD);
  };
  const track = (x,y) => {
    if(Math.abs(x-sx) > THRESH || Math.abs(y-sy) > THRESH){ moved = true; clearTimeout(timer); }
  };
  const cancel = () => clearTimeout(timer);
  const doCopy = async () => {
    const text = el.dataset.copyText;
    if(!text) return;
    try{
      await navigator.clipboard.writeText(text);
      if(navigator.vibrate) navigator.vibrate(12);
      toast('본문을 복사했습니다');
    }catch(e){ toast('이 브라우저에서는 복사를 지원하지 않습니다'); }
  };
  el.addEventListener('touchstart', e => { const t=e.touches[0]; begin(t.clientX,t.clientY); }, {passive:true});
  el.addEventListener('touchmove',  e => { const t=e.touches[0]; track(t.clientX,t.clientY); }, {passive:true});
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown', e => begin(e.clientX,e.clientY));
  el.addEventListener('mousemove', e => { if(timer) track(e.clientX,e.clientY); });
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
}
function headingsOf(verses, max){
  if(!verses) return [];
  const out = [];
  verses.forEach(o => { if(o.t){ o.t.split(' / ').forEach(t => { const c = t.replace(/\([^)]*\)/g,'').trim(); if(c && out.indexOf(c) < 0) out.push(c); }); } });
  return out.slice(0, max || 4);
}

/* ══════════════════════════════════════════════
   생각을 넓히는 질문 — 본문 장르에 맞춰 매일 달라진다
   ══════════════════════════════════════════════ */
const WIDEN = {
  '율법서':[
    '이 규례가 그 시대 사람들에게 어떤 보호가 되었을지 상상해보세요. 오늘 우리 공동체에서는 무엇이 그런 역할을 합니까?',
    '하나님이 굳이 이렇게까지 자세하게 말씀하신 이유는 무엇일까요?',
    '이 말씀이 없었다면 이스라엘은 어떤 백성이 되었을까요?',
    '여기서 요구되는 거룩함을 내 일터와 가정의 언어로 바꾸면 무엇이 됩니까?',
    '이 본문은 훗날 예수님에게서 어떻게 완성됩니까?'
  ],
  '역사서':[
    '이 사건을 당시 평범한 백성의 자리에서 본다면 무엇이 가장 두려웠을까요?',
    '본문에 이름 없이 스쳐 지나가는 사람들은 이 일을 어떻게 겪었을까요?',
    '하나님이 침묵하시는 것처럼 보이는 대목이 있습니까? 그때 무슨 일이 벌어지고 있었을까요?',
    '이 선택이 다음 세대에 어떤 흔적을 남겼을지 짚어보세요.',
    '우리 교회가 이 이야기 속 한 인물이라면 지금 어디쯤 서 있습니까?'
  ],
  '시가서':[
    '이런 감정까지 하나님께 소리 내어 말할 수 있다는 것은 무엇을 뜻합니까?',
    '지금 내 주변에 이 기도를 대신 드려주어야 할 사람이 있습니까?',
    '이 고백을 쓴 사람은 어떤 형편이었을까요? 그 자리에서 이 말이 나왔다는 것이 놀랍지 않습니까?',
    '이 본문을 슬픔 가운데 있는 사람에게 읽어준다면 어느 구절을 골라주시겠습니까?',
    '찬양과 탄식이 한 책에 나란히 놓여 있는 이유는 무엇일까요?'
  ],
  '선지서':[
    '이 경고를 들은 사람들은 스스로를 어떤 사람이라 여기고 있었을까요?',
    '오늘 우리 사회에서 같은 말을 한다면 누구를 향하게 될까요?',
    '심판의 말씀 속에 숨어 있는 하나님의 마음은 무엇입니까?',
    '이 약속은 어디에서 이루어졌고, 아직 남아 있는 부분은 무엇입니까?',
    '내가 듣고 싶지 않은 말이 이 본문에 있다면 어느 구절입니까?'
  ],
  '복음서':[
    '예수님의 이 말씀을 처음 들은 사람들은 왜 놀랐을까요?',
    '이 장면에서 예수님이 하지 않으신 일은 무엇입니까? 그것도 하나의 메시지입니다.',
    '내가 그 자리에 있었다면 어느 인물에 가장 가까웠을까요?',
    '이 말씀을 오늘 우리 동네에서 하신다면 어떤 예를 드셨을까요?',
    '제자들이 끝내 이해하지 못한 것은 무엇이고, 나는 무엇을 이해하지 못하고 있습니까?'
  ],
  '서신서':[
    '이 편지를 받은 교회는 어떤 문제를 겪고 있었을까요?',
    '이 권면이 필요 없는 공동체라면 어떤 모습일까요?',
    '이 가르침을 한 문장으로 줄이면 무엇입니까? 그 문장이 내 삶에서 시험받는 자리는 어디입니까?',
    '믿는 내용과 사는 방식이 여기서 어떻게 이어지고 있습니까?',
    '이 말이 나 한 사람이 아니라 우리 공동체에게 쓰인 것이라면 무엇이 달라집니까?'
  ],
  '예언서':[
    '이 환상을 처음 읽은 박해받던 성도들에게 이 장면은 어떤 위로였을까요?',
    '무섭게 보이는 장면 뒤에 놓인 약속은 무엇입니까?',
    '이 본문이 그리는 끝을 믿는다면, 오늘 무엇을 덜 두려워해도 됩니까?'
  ]
};
const WIDEN_ANY = [
  '이 본문을 처음 듣는 사람에게 한 문장으로 전한다면 무엇이라고 하시겠습니까?',
  '이 말씀이 사실이라면 우리 집의 무엇이 달라져야 합니까?',
  '이 본문에서 내가 가장 이해하기 어려운 부분은 어디입니까? 그 질문을 그대로 적어두세요.'
];
function widenQ(date, book){
  const pool = (book && WIDEN[book.g]) ? WIDEN[book.g].concat(WIDEN_ANY) : WIDEN_ANY;
  const d = parse(date);
  const n = Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000);
  return pool[n % pool.length];
}
