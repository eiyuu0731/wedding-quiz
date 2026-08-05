"""投資基準スコアリング＆判定。

基準値は criteria.json で上書き可能。判定は必ず理由付きで返す。
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field

from analyzer import Analysis, price_for_target_net_yield

# 物件タイプ別の目標実質利回り(初期値: 保守的な副業投資家想定)
DEFAULT_CRITERIA = {
    "target_net_yield": {"区分": 0.05, "一棟": 0.07, "戸建": 0.10},
    "min_dscr": 1.2,
    "min_ccr": 0.06,
    "max_repayment_ratio": 0.55,
    "max_break_even_occupancy": 0.85,
    "min_equity_multiple": 1.3,
    "max_age_wooden": 30,      # 木造でこの築年数超は減点
    "max_age_rc": 45,
}


def load_criteria(path: str | None = None) -> dict:
    path = path or os.path.join(os.path.dirname(__file__), "criteria.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            user = json.load(f)
        merged = {**DEFAULT_CRITERIA, **user}
        merged["target_net_yield"] = {
            **DEFAULT_CRITERIA["target_net_yield"],
            **user.get("target_net_yield", {}),
        }
        return merged
    return DEFAULT_CRITERIA


@dataclass
class Judgement:
    score: int
    grade: str          # A / B / C / D
    label: str
    reasons_good: list[str] = field(default_factory=list)
    reasons_bad: list[str] = field(default_factory=list)
    suggested_offer_price: float | None = None  # 指値提案(万円)
    checklist: list[str] = field(default_factory=list)


GRADE_LABELS = {
    "A": "買付検討 — 数字は基準クリア。現地調査を最優先で",
    "B": "現地調査へ — 概ね良好。弱点を現地で確認",
    "C": "指値・条件交渉次第 — このままでは基準未達",
    "D": "見送り — 基準から大きく乖離",
}


def judge(a: Analysis, criteria: dict | None = None) -> Judgement:
    c = criteria or load_criteria()
    good: list[str] = []
    bad: list[str] = []
    score = 0
    p = a.prop

    target_ny = c["target_net_yield"].get(p.ptype, 0.07)

    # 実質利回り (30点)
    if a.net_yield >= target_ny:
        score += 30
        good.append(f"実質利回り {a.net_yield:.1%} ≥ 目標 {target_ny:.0%}")
    elif a.net_yield >= target_ny * 0.85:
        score += 18
        bad.append(f"実質利回り {a.net_yield:.1%} が目標 {target_ny:.0%} をやや下回る")
    else:
        bad.append(f"実質利回り {a.net_yield:.1%} が目標 {target_ny:.0%} を大きく下回る")

    # DSCR (20点)
    if a.annual_debt_service == 0:
        score += 20
        good.append("現金購入(借入なし) — 返済リスクなし")
    elif a.dscr >= c["min_dscr"] + 0.1:
        score += 20
        good.append(f"DSCR {a.dscr:.2f} で返済余力あり")
    elif a.dscr >= c["min_dscr"]:
        score += 14
        good.append(f"DSCR {a.dscr:.2f} は基準ぎりぎりクリア")
    elif a.dscr >= 1.0:
        score += 5
        bad.append(f"DSCR {a.dscr:.2f} < 基準 {c['min_dscr']} — 空室・金利上昇に弱い")
    else:
        bad.append(f"DSCR {a.dscr:.2f} < 1.0 — 満室想定でも返済が家賃収益を上回るリスク")

    # 税引前CF (15点)
    if a.annual_cf_pretax > 0 and a.ccr >= c["min_ccr"]:
        score += 15
        good.append(f"税引前CF +{a.annual_cf_pretax:.0f}万円/年、CCR {a.ccr:.1%}")
    elif a.annual_cf_pretax > 0:
        score += 9
        bad.append(f"CFは黒字だがCCR {a.ccr:.1%} < 基準 {c['min_ccr']:.0%}")
    else:
        bad.append(f"税引前CFが赤字 ({a.annual_cf_pretax:.0f}万円/年)")

    # 返済比率 (10点)
    if a.repayment_ratio <= c["max_repayment_ratio"]:
        score += 10
        good.append(f"返済比率 {a.repayment_ratio:.0%} は許容内")
    else:
        bad.append(f"返済比率 {a.repayment_ratio:.0%} > 上限 {c['max_repayment_ratio']:.0%}")

    # 損益分岐入居率 (10点)
    if a.break_even_occupancy <= c["max_break_even_occupancy"]:
        score += 10
        good.append(f"損益分岐入居率 {a.break_even_occupancy:.0%} — 空室耐性あり")
    else:
        bad.append(f"損益分岐入居率 {a.break_even_occupancy:.0%} — 少しの空室で赤字化")

    # 出口 (10点)
    if a.equity_multiple >= c["min_equity_multiple"] and a.exit_net_proceeds > 0:
        score += 10
        good.append(
            f"{a.hold_years}年保有で自己資金 {a.equity_multiple:.1f}倍"
            + (f"、IRR {a.irr:.1%}" if a.irr is not None else "")
        )
    elif a.exit_net_proceeds > 0:
        score += 5
        bad.append(f"出口の手残りは黒字だが自己資金倍率 {a.equity_multiple:.1f}倍と伸びない")
    else:
        bad.append(
            f"想定売却時に残債割れ (残債{a.loan_balance_at_exit:.0f} > 手取り想定) — 売るに売れないリスク"
        )

    # 築年・構造 (5点)
    age_ok = True
    if a.age is not None:
        if p.structure == "木造" and a.age > c["max_age_wooden"]:
            age_ok = False
            bad.append(f"木造築{a.age}年 — 融資期間・出口に制約")
        elif p.structure in ("RC", "SRC") and a.age > c["max_age_rc"]:
            age_ok = False
            bad.append(f"{p.structure}築{a.age}年 — 修繕リスク・出口に注意")
    if age_ok:
        score += 5

    # 減価償却と融資期間のミスマッチ(デッドクロス予兆)は注記のみ
    if a.depreciation_years < p.loan_years:
        bad.append(
            f"償却期間{a.depreciation_years}年 < 融資期間{p.loan_years}年 — "
            f"償却切れ後に税負担増(デッドクロス)。保有{a.depreciation_years}年以内の出口を検討"
        )

    if score >= 75:
        grade = "A"
    elif score >= 60:
        grade = "B"
    elif score >= 45:
        grade = "C"
    else:
        grade = "D"

    j = Judgement(score=score, grade=grade, label=GRADE_LABELS[grade],
                  reasons_good=good, reasons_bad=bad)

    # C判定には指値を提案
    if grade in ("C", "B") and a.net_yield < target_ny:
        offer = price_for_target_net_yield(p, target_ny)
        if 0 < offer < p.price:
            j.suggested_offer_price = round(offer, 0)

    j.checklist = _checklist(a)
    return j


def _checklist(a: Analysis) -> list[str]:
    """現地調査・精査チェックリスト(ルールベース。AI補足はai_advisor側)"""
    p = a.prop
    items = [
        "レントロールと実際の入居状況の突合(現況家賃・入居期間・滞納)",
        "周辺の競合募集事例と想定賃料の妥当性確認",
        "共用部・外壁・屋上(屋根)・給排水の状態確認、修繕履歴の取得",
        "ハザードマップ(洪水・土砂・液状化)と嫌悪施設の確認",
    ]
    if p.ptype == "区分":
        items.append("管理組合の総会議事録・修繕積立金残高・滞納状況の確認")
        items.append("管理費・修繕積立金の値上げ予定の有無")
    if p.ptype == "一棟":
        items.append("入居者属性の偏り(法人一括・生活保護比率等)の確認")
        items.append("プロパンガス・CATV等の設備契約の縛り確認")
    if p.ptype == "戸建":
        items.append("雨漏り・シロアリ・傾き(レーザーレベル)・再建築可否の確認")
    if p.structure == "木造" and a.age and a.age > 22:
        items.append("耐震性(新耐震か否か・壁量)と火災保険料の確認")
    if a.age and a.age > 30:
        items.append("給排水管の更新履歴(漏水リスク)の確認")
    return items
