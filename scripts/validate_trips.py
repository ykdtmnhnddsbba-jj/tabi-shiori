#!/usr/bin/env python3
"""trips/*.json の事前チェック（編集室の「チェック」と同じ規則）。使い方: python3 scripts/validate_trips.py [trips/xxx.json ...]
エラーがあると終了コード1。「仮」や任意項目の空きは注意として表示のみ。"""
import json, re, sys, glob, os

TIME = re.compile(r'^([01]\d|2[0-3]|24):[0-5]\d$')
DEFAULTS = {'新しい予定', '新しいメモ', '宿の名前', '新しいしおり'}

def mm(t):
    m = re.match(r'^(\d{1,2}):(\d{2})$', t or '')
    return int(m[1]) * 60 + int(m[2]) if m else None

def earlier(a, b):
    x, y = mm(a), mm(b)
    return x is not None and y is not None and x < y

def validate(t):
    out = []
    def add(l, where, msg): out.append((l, where, msg))
    if not (t.get('title') or '').strip() or t.get('title') in DEFAULTS: add('err', '全体', 'タイトルが未入力')
    if not (t.get('dates') or '').strip(): add('err', '全体', '日付の表示が空')
    days = t.get('days') or []
    if not days:
        add('err', '全体', '日がない'); return out
    prev = ''
    for di, d in enumerate(days):
        if prev and d['date'] <= prev: add('err', d['label'], '日付が前の日より前か同じ')
        prev = d['date']
        if not d['items']: add('warn', d['label'], '項目がない')
        last = None; lt = ''
        items = d['items']
        for i, it in enumerate(items):
            tag = f"{d['label']} {it.get('t') or '--:--'} " + (f"{it.get('from','?')}→{it.get('to','?')}" if it['type'] == 'move' else (it.get('title') or it.get('text') or '(無題)'))
            E = lambda m: add('err', tag, m)
            W = lambda m: add('warn', tag, m)
            for k, n in (('t', '時刻'), ('open', '開場'), ('end', '終了'), ('arr', '到着時刻')):
                if it.get(k) and not TIME.match(it[k]): E(n + 'の形式が違う（HH:MM）')
            if not it.get('t'): E('時刻が空')
            if it.get('tentative'): W('「仮」のまま')
            nx = items[i + 1] if i + 1 < len(items) else None
            nx_start = mm(nx.get('open') or nx.get('t')) if nx else None
            nx_t = mm(nx.get('t')) if nx else None
            ty = it['type']
            if ty == 'event':
                if not (it.get('title') or '').strip() or it['title'] in DEFAULTS: E('タイトルが未入力')
                if not (it.get('venue') or '').strip(): W('会場が空')
                if it.get('group') and not (it.get('ticket') or '').startswith('http'): W('チケットURLが空')
                if earlier(it.get('end'), it.get('t')): E('終了が開始より早い')
                if earlier(it.get('t'), it.get('open')): E('開場が開演より遅い')
                if it.get('end') and nx and earlier(nx.get('t'), it['end']): W(f"終了({it['end']})より前に次の項目({nx['t']})が始まる")
            elif ty == 'move':
                if not (it.get('from') or '').strip() or not (it.get('to') or '').strip(): E('出発地か到着地が空')
                if not it.get('arr') and not it.get('dur'): W('到着時刻も所要時間も空')
                if earlier(it.get('arr'), it.get('t')): E('到着が出発より早い')
                if it.get('mode') in ('train', 'shinkansen') and not (it.get('detail') or '').strip(): W('路線・列車名が空')
                if it.get('mode') == 'shinkansen' and not (it.get('seat') or '').strip(): W('座席が空')
                if nx and nx['type'] in ('event', 'stay') and earlier(nx.get('open') or nx.get('t'), it.get('arr')): E(f"到着({it['arr']})が次の予定の開始より遅い")
            elif ty == 'stay':
                if not (it.get('title') or '').strip() or it['title'] in DEFAULTS: E('宿の名前が未入力')
                if not (it.get('address') or '').strip(): W('住所が空')
                if not (it.get('tel') or '').strip(): W('電話番号が空')
            elif ty == 'memo':
                if not (it.get('text') or '').strip() or it['text'] in DEFAULTS: E('内容が未入力')
            m = mm(it.get('t'))
            if m is not None:
                if last is not None and m < last: E(f'時刻が前の項目({lt})より早く、順序が逆')
                last, lt = m, it['t']
    if not t.get('packing'): add('warn', '全体', '持ち物が空')
    return out

if __name__ == '__main__':
    files = sys.argv[1:] or [f for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'trips', '*.json'))) if not f.endswith('index.json')]
    bad = 0
    for f in files:
        t = json.load(open(f, encoding='utf-8'))
        res = validate(t)
        errs = [r for r in res if r[0] == 'err']
        print(f"== {os.path.basename(f)}: エラー {len(errs)} 件・注意 {len(res) - len(errs)} 件")
        for l, w, m in res: print(f"  [{'エラー' if l == 'err' else '注意'}] {w}: {m}")
        bad += len(errs)
    sys.exit(1 if bad else 0)
