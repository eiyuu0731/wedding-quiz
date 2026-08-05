#!/usr/bin/env python3
"""不動産1次スクリーニングCLI

使い方:
  python3 main.py analyze [ファイル...]       # 物件JSONを分析(省略時 properties/*.json)
  python3 main.py intake <テキストファイル> [-o 出力.json]   # マイソク文面→物件JSON(要APIキー)
  python3 main.py loan-matrix <物件JSON>      # 融資条件の感度分析
"""

from __future__ import annotations

import glob
import json
import os
import sys

from analyzer import Property, analyze, loan_matrix
from report import property_report, ranking_report
from scoring import judge, load_criteria

BASE = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE, "reports")


def _load(path: str) -> Property:
    with open(path, encoding="utf-8") as f:
        return Property.from_dict(json.load(f))


def cmd_analyze(paths: list[str]) -> None:
    if not paths:
        paths = sorted(glob.glob(os.path.join(BASE, "properties", "*.json")))
    if not paths:
        print("物件JSONが見つかりません。properties/ に置くかパスを指定してください。")
        sys.exit(1)

    criteria = load_criteria()
    os.makedirs(REPORTS_DIR, exist_ok=True)
    results = []
    use_ai = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))

    for path in paths:
        prop = _load(path)
        a = analyze(prop)
        j = judge(a, criteria)
        results.append((a, j))

        ai_comment = None
        if use_ai:
            from ai_advisor import risk_comment
            ai_comment = risk_comment({
                "物件": prop.name, "種別": prop.ptype, "所在": prop.location,
                "価格万円": prop.price, "構造": prop.structure, "築年": prop.built_year,
                "実質利回り": round(a.net_yield, 4), "DSCR": round(a.dscr, 2),
                "税引前CF万円": round(a.annual_cf_pretax, 1),
                "判定": j.grade, "マイナス要因": j.reasons_bad, "備考": prop.notes,
            })

        out = os.path.join(REPORTS_DIR, os.path.splitext(os.path.basename(path))[0] + "_report.md")
        with open(out, "w", encoding="utf-8") as f:
            f.write(property_report(a, j, ai_comment))
        print(f"[{j.grade}] {j.score:3d}点  {prop.name}  → {os.path.relpath(out, BASE)}")

    rank_path = os.path.join(REPORTS_DIR, "_ranking.md")
    with open(rank_path, "w", encoding="utf-8") as f:
        f.write(ranking_report(results))
    print(f"\nランキング → {os.path.relpath(rank_path, BASE)}")
    if not use_ai:
        print("(ANTHROPIC_API_KEY 未設定のためAIリスク分析はスキップ。計算・判定は完了)")


def cmd_intake(src: str, out: str | None) -> None:
    from ai_advisor import structure_maisoku
    with open(src, encoding="utf-8") as f:
        text = f.read()
    data = structure_maisoku(text)
    if data is None:
        print("構造化に失敗しました。ANTHROPIC_API_KEY が設定されているか確認してください。")
        sys.exit(1)
    out = out or os.path.join(BASE, "properties", "intake_output.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"物件JSONを生成 → {out}")
    print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_loan_matrix(path: str) -> None:
    prop = _load(path)
    rates = [0.01, 0.015, 0.02, 0.025, 0.03]
    years_list = [15, 20, 25, 30, 35]
    print(f"{prop.name}: 金利×期間ごとの 税引前CF(万円/年) / DSCR")
    header = "金利\\期間 | " + " | ".join(f"{y}年" for y in years_list)
    print(header)
    rows = loan_matrix(prop, rates, years_list)
    for rate in rates:
        cells = []
        for y in years_list:
            r = next(x for x in rows if x["loan_rate"] == rate and x["loan_years"] == y)
            cells.append(f"{r['annual_cf_pretax']:+.0f} / {r['dscr']:.2f}")
        print(f"{rate:.1%}    | " + " | ".join(cells))


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)
    cmd, rest = args[0], args[1:]
    if cmd == "analyze":
        cmd_analyze(rest)
    elif cmd == "intake":
        out = None
        if "-o" in rest:
            i = rest.index("-o")
            out = rest[i + 1]
            rest = rest[:i] + rest[i + 2:]
        cmd_intake(rest[0], out)
    elif cmd == "loan-matrix":
        cmd_loan_matrix(rest[0])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
