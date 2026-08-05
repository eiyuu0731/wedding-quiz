"""Markdownレポート生成"""

from __future__ import annotations

import math

from analyzer import Analysis
from scoring import Judgement


def _pct(x: float) -> str:
    return f"{x:.1%}"


def _man(x: float) -> str:
    return f"{x:,.0f}万円"


def property_report(a: Analysis, j: Judgement, ai_comment: str | None = None) -> str:
    p = a.prop
    lines = [
        f"# 物件分析レポート: {p.name}",
        "",
        f"**判定: {j.grade}（{j.score}点） — {j.label}**",
        "",
        "## 物件概要",
        "",
        "| 項目 | 値 |",
        "|---|---|",
        f"| 種別 | {p.ptype} |",
        f"| 所在 | {p.location} |",
        f"| 価格 | {_man(p.price)} |",
        f"| 構造/築年 | {p.structure} / "
        + (f"{p.built_year}年築(築{a.age}年)" if p.built_year else "不明") + " |",
        f"| 満室時月額賃料 | {_man(p.monthly_rent)} |",
        "",
        "## 収支サマリー",
        "",
        "| 指標 | 値 | 補足 |",
        "|---|---|---|",
        f"| 表面利回り | {_pct(a.gross_yield)} | 満室時年間賃料 ÷ 価格 |",
        f"| 実質利回り | {_pct(a.net_yield)} | NOI ÷ (価格+諸費用) |",
        f"| NOI | {_man(a.noi)}/年 | 空室率{_pct(a.assumptions['vacancy_rate'])}想定 |",
        f"| 借入 | {_man(a.loan_amount)} (LTV {_pct(p.ltv)}) | 金利{_pct(p.loan_rate)}・{p.loan_years}年 |",
        f"| 自己資金 | {_man(a.equity)} | 頭金+諸費用{_pct(a.assumptions['purchase_cost_rate'])} |",
        f"| 年間返済額 | {_man(a.annual_debt_service)} | 月{a.monthly_payment:.1f}万円 |",
        f"| DSCR | " + (f"{a.dscr:.2f}" if math.isfinite(a.dscr) else "—(借入なし)") + " | NOI ÷ 年間返済額 |",
        f"| 返済比率 | {_pct(a.repayment_ratio)} | 満室賃料に対する返済割合 |",
        f"| 損益分岐入居率 | {_pct(a.break_even_occupancy)} | これ未満の入居率で赤字 |",
        f"| 税引前CF | {a.annual_cf_pretax:+,.0f}万円/年 | CCR {_pct(a.ccr)} |",
        f"| 税引後CF(初年度概算) | {a.annual_cf_aftertax_y1:+,.0f}万円/年 | "
        f"償却{a.depreciation_years}年・{_man(a.annual_depreciation)}/年、税率{_pct(a.assumptions['tax_rate'])} |",
        "",
        f"## 出口シミュレーション（{a.hold_years}年保有・売却価格は購入時の{_pct(a.assumptions['sale_price_ratio'])}想定）",
        "",
        "| 指標 | 値 |",
        "|---|---|",
        f"| 累計CF | {a.cumulative_cf:+,.0f}万円 |",
        f"| 売却時残債 | {_man(a.loan_balance_at_exit)} |",
        f"| 売却手取り(残債返済後) | {a.exit_net_proceeds:+,.0f}万円 |",
        f"| 自己資金回収倍率 | {a.equity_multiple:.2f}倍 |",
        f"| IRR(税引前) | " + (f"{_pct(a.irr)}" if a.irr is not None else "算出不可") + " |",
        "",
        "## 判定理由",
        "",
    ]
    if j.reasons_good:
        lines.append("**プラス要因**")
        lines += [f"- ✅ {r}" for r in j.reasons_good]
        lines.append("")
    if j.reasons_bad:
        lines.append("**マイナス要因・リスク**")
        lines += [f"- ⚠️ {r}" for r in j.reasons_bad]
        lines.append("")
    if j.suggested_offer_price:
        discount = 1 - j.suggested_offer_price / p.price
        lines += [
            "## 指値提案",
            "",
            f"目標実質利回りを満たすには **{_man(j.suggested_offer_price)}"
            f"（{_pct(discount)}指値）** が目安。",
            "",
        ]
    lines += ["## 現地調査チェックリスト（人間の担当）", ""]
    lines += [f"- [ ] {c}" for c in j.checklist]
    lines.append("")
    if ai_comment:
        lines += ["## AIリスク分析コメント", "", ai_comment, ""]
    if p.notes:
        lines += ["## 備考", "", p.notes, ""]
    lines += [
        "---",
        "*このレポートは1次スクリーニングです。数値は想定に基づく概算であり、"
        "購入判断の前に必ず現地調査・レントロール確認・融資条件の確定を行ってください。*",
    ]
    return "\n".join(lines)


def ranking_report(results: list[tuple[Analysis, Judgement]]) -> str:
    results = sorted(results, key=lambda x: -x[1].score)
    lines = [
        "# 物件ランキング（1次スクリーニング結果）",
        "",
        "| 順位 | 判定 | 点数 | 物件 | 価格 | 実質利回り | DSCR | 税引前CF/年 | 次のアクション |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for i, (a, j) in enumerate(results, 1):
        action = j.label.split(" — ")[0]
        if j.suggested_offer_price:
            action += f"(指値{j.suggested_offer_price:,.0f}万)"
        lines.append(
            f"| {i} | **{j.grade}** | {j.score} | {a.prop.name} | {a.prop.price:,.0f}万 "
            f"| {a.net_yield:.1%} | "
            + (f"{a.dscr:.2f}" if math.isfinite(a.dscr) else "—")
            + f" | {a.annual_cf_pretax:+,.0f}万 | {action} |"
        )
    lines += [
        "",
        "判定基準: A(75点〜)=買付検討 / B(60〜)=現地調査 / C(45〜)=指値次第 / D=見送り",
    ]
    return "\n".join(lines)
