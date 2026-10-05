#!/usr/bin/env python3
"""
src/*.js + src/app_head.html 을 하나의 정적 HTML 아티팩트로 합쳐
dist/qt-site.html 을 만든다.

주의: 이 파일은 claude.ai 아티팩트(Artifact)로 게시되었을 때만 완전히
동작한다. GitHub Pages 등 일반 정적 호스팅에 그대로 올리면 화면은 뜨지만
window.claude(db·sample 기능)가 없어 나눔/관리자/성경 본문 공유/배지
자랑/AI 초안 생성 같은 기능은 전부 비활성 상태로 시작한다. README 참고.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
head = (ROOT / 'src/app_head.html').read_text(encoding='utf-8')
js = (ROOT / 'src/app_js.js').read_text(encoding='utf-8')
bib = (ROOT / 'src/bible_js.js').read_text(encoding='utf-8')
badges = (ROOT / 'src/badges_js.js').read_text(encoding='utf-8')
data = (ROOT / 'src/books.js').read_text(encoding='utf-8') + '\n' + (ROOT / 'src/weeks.js').read_text(encoding='utf-8')

js = js.replace('/*__DATA__*/', data)
js = js.replace('/* ══════════ 시작 ══════════ */', bib + '\n' + badges + '\n/* ══════════ 시작 ══════════ */', 1)

html = head + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
out = ROOT / 'dist/qt-site.html'
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html)} bytes)')
