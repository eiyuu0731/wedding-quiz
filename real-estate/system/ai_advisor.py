"""Claude API連携（任意機能）。

担当はLLMが得意な2つだけ:
  1. マイソク等の自由文 → 物件JSONへの構造化 (structure_maisoku)
  2. 分析結果に対する定性的リスク分析コメント生成 (risk_comment)

計算はすべて analyzer.py が行い、LLMには計算させない。
ANTHROPIC_API_KEY 未設定時は None を返し、パイプラインは劣化なしで続行する。
"""

from __future__ import annotations

import json
import os

MODEL = "claude-opus-5"
FALLBACK_BETAS = ["server-side-fallback-2026-07-01"]

PROPERTY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name", "ptype", "location", "price", "monthly_rent", "structure"],
    "properties": {
        "name": {"type": "string", "description": "物件名"},
        "ptype": {"type": "string", "enum": ["区分", "一棟", "戸建"]},
        "location": {"type": "string"},
        "price": {"type": "number", "description": "販売価格(万円)"},
        "monthly_rent": {"type": "number", "description": "満室時月額賃料(万円)。年額しか無ければ12で割る"},
        "structure": {"type": "string", "enum": ["RC", "SRC", "重量鉄骨", "軽量鉄骨", "木造"]},
        "built_year": {"type": ["integer", "null"], "description": "築年(西暦)。不明ならnull"},
        "annual_fixed_cost": {"type": "number",
                              "description": "固定資産税・管理費・修繕積立金・保険等の年額合計(万円)。不明なら0"},
        "notes": {"type": "string", "description": "利回りに影響しうる特記事項(現況空室、告知事項、再建築不可等)"},
    },
}


def _client():
    if not os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return None
    try:
        import anthropic
        return anthropic.Anthropic()
    except Exception:
        return None


def structure_maisoku(text: str) -> dict | None:
    """マイソク・物件紹介文の自由文を物件JSONに構造化する。キー未設定ならNone。"""
    client = _client()
    if client is None:
        return None
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=4096,
        betas=FALLBACK_BETAS,
        fallbacks="default",
        system=(
            "あなたは不動産投資の物件情報を構造化するアシスタントです。"
            "与えられたマイソクや物件紹介文から情報を抽出し、指定スキーマのJSONだけを返してください。"
            "金額の単位は万円に統一すること。推測が必要な場合はnotesにその旨を書くこと。"
        ),
        messages=[{"role": "user", "content": text}],
        output_config={"format": {"type": "json_schema", "schema": PROPERTY_SCHEMA}},
    )
    if response.stop_reason == "refusal":
        return None
    for block in response.content:
        if block.type == "text":
            return json.loads(block.text)
    return None


def risk_comment(analysis_summary: dict) -> str | None:
    """分析結果に対する定性的リスク分析。キー未設定ならNone。"""
    client = _client()
    if client is None:
        return None
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=4096,
        betas=FALLBACK_BETAS,
        fallbacks="default",
        system=(
            "あなたは慎重な不動産投資アドバイザーです。1次スクリーニングの計算結果を受け取り、"
            "数字に表れない定性リスク（エリア需要、出口の流動性、想定の甘い前提、"
            "融資評価との乖離の可能性）を3〜5点、簡潔な箇条書きで指摘してください。"
            "計算のやり直しはせず、与えられた数値は正としてください。断定を避け、現地で確認すべき点に落とし込むこと。"
        ),
        messages=[{"role": "user", "content": json.dumps(analysis_summary, ensure_ascii=False)}],
    )
    if response.stop_reason == "refusal":
        return None
    return "".join(b.text for b in response.content if b.type == "text") or None
