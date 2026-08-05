"""収支計算エンジン。

金額の単位は「万円」に統一。利回り・率は小数(0.08 = 8%)。
LLMには計算させず、すべてここで決定論的に計算する。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


# 法定耐用年数（住宅用）
USEFUL_LIFE = {"RC": 47, "SRC": 47, "重量鉄骨": 34, "軽量鉄骨": 27, "木造": 22}

DEFAULTS = {
    "vacancy_rate": 0.10,        # 空室損
    "mgmt_fee_rate": 0.05,       # 賃貸管理料（賃料比）
    "purchase_cost_rate": 0.08,  # 購入諸費用（物件価格比）
    "building_ratio": 0.5,       # 建物価格割合（未指定時）
    "tax_rate": 0.30,            # 所得税+住民税の限界税率
    "rent_decline_rate": 0.01,   # 年間賃料下落率
    "hold_years": 10,            # 保有期間シミュレーション
    "sale_price_ratio": 0.90,    # 売却想定価格（購入価格比）
}


@dataclass
class Property:
    name: str
    ptype: str                   # 区分 / 一棟 / 戸建
    location: str
    price: float                 # 物件価格(万円)
    monthly_rent: float          # 満室時月額賃料(万円)
    structure: str = "RC"
    built_year: int | None = None
    annual_fixed_cost: float = 0.0   # 固定資産税・管理費修繕積立金・保険等の年額(万円)
    building_ratio: float | None = None
    vacancy_rate: float | None = None
    mgmt_fee_rate: float | None = None
    purchase_cost_rate: float | None = None
    # 融資条件
    ltv: float = 0.9             # 借入割合
    loan_rate: float = 0.02      # 金利(年)
    loan_years: int = 30
    notes: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> "Property":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in known})


@dataclass
class Analysis:
    prop: Property
    # 収入・支出
    annual_rent_full: float = 0.0
    effective_rent: float = 0.0
    opex: float = 0.0
    noi: float = 0.0
    # 利回り
    gross_yield: float = 0.0
    net_yield: float = 0.0
    # 融資
    loan_amount: float = 0.0
    equity: float = 0.0          # 自己資金(頭金+諸費用)
    monthly_payment: float = 0.0
    annual_debt_service: float = 0.0
    dscr: float = 0.0
    repayment_ratio: float = 0.0  # 返済比率(満室賃料比)
    break_even_occupancy: float = 0.0
    # キャッシュフロー
    annual_cf_pretax: float = 0.0
    ccr: float = 0.0
    # 税務
    depreciation_years: int = 0
    annual_depreciation: float = 0.0
    annual_cf_aftertax_y1: float = 0.0
    # 保有シミュレーション
    hold_years: int = 0
    loan_balance_at_exit: float = 0.0
    sale_price_assumed: float = 0.0
    exit_net_proceeds: float = 0.0
    cumulative_cf: float = 0.0
    equity_multiple: float = 0.0
    irr: float | None = None
    age: int | None = None
    assumptions: dict = field(default_factory=dict)


def _pmt(principal: float, annual_rate: float, years: int) -> float:
    """元利均等の月額返済額"""
    n = years * 12
    if principal <= 0:
        return 0.0
    if annual_rate <= 0:
        return principal / n
    r = annual_rate / 12
    return principal * r * (1 + r) ** n / ((1 + r) ** n - 1)


def _loan_balance(principal: float, annual_rate: float, years: int, months_paid: int) -> float:
    """元利均等でmonths_paid回返済後の残債"""
    if principal <= 0:
        return 0.0
    n = years * 12
    months_paid = min(months_paid, n)
    if annual_rate <= 0:
        return principal * (1 - months_paid / n)
    r = annual_rate / 12
    pmt = _pmt(principal, annual_rate, years)
    return principal * (1 + r) ** months_paid - pmt * ((1 + r) ** months_paid - 1) / r


def _irr(cashflows: list[float]) -> float | None:
    """二分法によるIRR（cashflows[0]が初期投資のマイナス）"""
    if not cashflows or cashflows[0] >= 0:
        return None

    def npv(rate: float) -> float:
        return sum(cf / (1 + rate) ** i for i, cf in enumerate(cashflows))

    lo, hi = -0.99, 10.0
    if npv(lo) * npv(hi) > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        if npv(lo) * npv(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return round((lo + hi) / 2, 4)


def depreciation_years_for(structure: str, age: int | None) -> int:
    life = USEFUL_LIFE.get(structure, 22)
    if age is None:
        age = 0
    if age >= life:
        return max(int(life * 0.2), 1)  # 耐用年数超過: 法定耐用年数×20%
    return life - age + int(age * 0.2)


def analyze(prop: Property, current_year: int = 2026) -> Analysis:
    a = Analysis(prop=prop)
    vacancy = prop.vacancy_rate if prop.vacancy_rate is not None else DEFAULTS["vacancy_rate"]
    mgmt = prop.mgmt_fee_rate if prop.mgmt_fee_rate is not None else DEFAULTS["mgmt_fee_rate"]
    cost_rate = prop.purchase_cost_rate if prop.purchase_cost_rate is not None else DEFAULTS["purchase_cost_rate"]
    bldg_ratio = prop.building_ratio if prop.building_ratio is not None else DEFAULTS["building_ratio"]
    tax_rate = DEFAULTS["tax_rate"]
    a.assumptions = {
        "vacancy_rate": vacancy, "mgmt_fee_rate": mgmt, "purchase_cost_rate": cost_rate,
        "building_ratio": bldg_ratio, "tax_rate": tax_rate,
        "rent_decline_rate": DEFAULTS["rent_decline_rate"],
        "sale_price_ratio": DEFAULTS["sale_price_ratio"],
    }

    a.age = (current_year - prop.built_year) if prop.built_year else None

    # 収支
    a.annual_rent_full = prop.monthly_rent * 12
    a.effective_rent = a.annual_rent_full * (1 - vacancy)
    a.opex = a.effective_rent * mgmt + prop.annual_fixed_cost
    a.noi = a.effective_rent - a.opex

    purchase_costs = prop.price * cost_rate
    a.gross_yield = a.annual_rent_full / prop.price if prop.price else 0.0
    a.net_yield = a.noi / (prop.price + purchase_costs) if prop.price else 0.0

    # 融資
    a.loan_amount = prop.price * prop.ltv
    a.equity = prop.price - a.loan_amount + purchase_costs
    a.monthly_payment = _pmt(a.loan_amount, prop.loan_rate, prop.loan_years)
    a.annual_debt_service = a.monthly_payment * 12
    a.dscr = a.noi / a.annual_debt_service if a.annual_debt_service else math.inf
    a.repayment_ratio = a.annual_debt_service / a.annual_rent_full if a.annual_rent_full else 0.0
    denom = a.annual_rent_full * (1 - mgmt)
    a.break_even_occupancy = (
        (prop.annual_fixed_cost + a.annual_debt_service) / denom if denom else 0.0
    )

    # CF
    a.annual_cf_pretax = a.noi - a.annual_debt_service
    a.ccr = a.annual_cf_pretax / a.equity if a.equity else 0.0

    # 税務(初年度概算): 課税所得 = NOI - 支払利息(初年度概算) - 減価償却
    a.depreciation_years = depreciation_years_for(prop.structure, a.age)
    building_price = prop.price * bldg_ratio
    a.annual_depreciation = building_price / a.depreciation_years
    interest_y1 = a.loan_amount * prop.loan_rate  # 初年度利息の近似
    taxable = a.noi - interest_y1 - a.annual_depreciation
    tax = max(taxable, 0) * tax_rate
    a.annual_cf_aftertax_y1 = a.annual_cf_pretax - tax

    # 保有期間シミュレーション(税引前・簡易)
    hold = DEFAULTS["hold_years"]
    a.hold_years = hold
    decline = DEFAULTS["rent_decline_rate"]
    cfs = [-a.equity]
    cumulative = 0.0
    for y in range(1, hold + 1):
        rent_y = a.annual_rent_full * (1 - decline) ** (y - 1) * (1 - vacancy)
        opex_y = rent_y * mgmt + prop.annual_fixed_cost
        cf_y = rent_y - opex_y - a.annual_debt_service
        cumulative += cf_y
        cfs.append(cf_y)
    a.cumulative_cf = cumulative
    a.loan_balance_at_exit = _loan_balance(a.loan_amount, prop.loan_rate, prop.loan_years, hold * 12)
    a.sale_price_assumed = prop.price * DEFAULTS["sale_price_ratio"]
    sale_cost = a.sale_price_assumed * 0.04  # 仲介手数料等
    a.exit_net_proceeds = a.sale_price_assumed - sale_cost - a.loan_balance_at_exit
    cfs[-1] += a.exit_net_proceeds
    a.equity_multiple = (cumulative + a.exit_net_proceeds) / a.equity if a.equity else 0.0
    a.irr = _irr(cfs)
    return a


def price_for_target_net_yield(prop: Property, target_net_yield: float) -> float:
    """目標実質利回りを満たす指値価格を逆算(万円)"""
    vacancy = prop.vacancy_rate if prop.vacancy_rate is not None else DEFAULTS["vacancy_rate"]
    mgmt = prop.mgmt_fee_rate if prop.mgmt_fee_rate is not None else DEFAULTS["mgmt_fee_rate"]
    cost_rate = prop.purchase_cost_rate if prop.purchase_cost_rate is not None else DEFAULTS["purchase_cost_rate"]
    effective = prop.monthly_rent * 12 * (1 - vacancy)
    noi = effective - (effective * mgmt + prop.annual_fixed_cost)
    if noi <= 0 or target_net_yield <= 0:
        return 0.0
    # net_yield = NOI / (price * (1 + cost_rate)) を price について解く
    return noi / target_net_yield / (1 + cost_rate)


def loan_matrix(prop: Property, rates: list[float], years_list: list[int]) -> list[dict]:
    """融資条件の感度分析: 金利×期間ごとのCF/DSCR"""
    rows = []
    for rate in rates:
        for years in years_list:
            p = Property.from_dict({**prop.__dict__, "loan_rate": rate, "loan_years": years})
            r = analyze(p)
            rows.append({
                "loan_rate": rate, "loan_years": years,
                "annual_cf_pretax": round(r.annual_cf_pretax, 1),
                "dscr": round(r.dscr, 2),
                "repayment_ratio": round(r.repayment_ratio, 3),
            })
    return rows
