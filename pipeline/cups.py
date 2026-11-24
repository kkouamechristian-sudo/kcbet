"""Coupes d'Europe : matchs et cotes DraftKings relayes par ESPN ; probabilites du marche, marge retiree, puis buts attendus."""
import glob, json, os
from datetime import datetime
import numpy as np
from scipy.optimize import minimize
import espn, paris

SLUGS = {"uefa.champions": ("UCL", "Ligue des champions"), "uefa.europa": ("UEL", "Ligue Europa"), "uefa.europa.conf": ("UECL", "Ligue Conférence")}
RHO = -0.08


def dec(a):
    """Cote americaine (+115, -155, EVEN) en cote decimale."""
    a = str(a or "").strip().upper()
    if a in ("EVEN", "EV"):
        return 2.0
    try:
        v = float(a)
    except ValueError:
        return None
    if v == 0:
        return None
    return 1 + v / 100 if v > 0 else 1 + 100 / -v


def pick(side):
    side = side or {}
    return dec((side.get("close") or {}).get("odds")) or dec((side.get("open") or {}).get("odds"))


def fit(pm, line, pover, x0=(1.4, 1.1)):
    """Buts attendus qui reproduisent les probabilites 1 X 2 du marche, et le plus/moins quand il existe."""
    def loss(x):
        lh, la = np.exp(x)
        M = paris.matrix(lh, la, RHO)
        n = M.shape[0]
        p = [np.tril(M, -1).sum(), np.trace(M), np.triu(M, 1).sum()]
        e = sum((a - b) ** 2 for a, b in zip(p, pm))
        if pover is not None:
            tot = np.add.outer(np.arange(n), np.arange(n))
            e += (M[tot > line].sum() - pover) ** 2
        return e
    r = minimize(loss, np.log(x0), method="Nelder-Mead", options=dict(xatol=1e-3, fatol=1e-8, maxiter=400))
    return [float(v) for v in np.exp(r.x)]


def fixtures(data, today):
    out, seen = [], set()
    for path in sorted(glob.glob(os.path.join(data, "CUP_*.json"))):
        slug = os.path.basename(path)[4:].rsplit("_", 1)[0]
        lg, nom = SLUGS[slug]
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        for e in raw.get("events", []):
            if e["id"] in seen or e.get("status", {}).get("type", {}).get("state") != "pre":
                continue
            c = e["competitions"][0]
            t = {x["homeAway"]: x for x in c["competitors"]}
            od = (c.get("odds") or [None])[0]
            if "home" not in t or "away" not in t or not od:
                continue
            ml = od.get("moneyline") or {}
            o = [pick(ml.get("home")), pick(ml.get("draw")) or dec((od.get("drawOdds") or {}).get("moneyLine")), pick(ml.get("away"))]
            if not all(x and x > 1 for x in o):
                continue
            seen.add(e["id"])
            ko = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
            if ko.date() < today:
                continue
            inv = [1 / x for x in o]
            pm = [x / sum(inv) for x in inv]
            line = od.get("overUnder")
            tot = od.get("total") or {}
            ov, un = pick(tot.get("over")), pick(tot.get("under"))
            pover = (1 / ov) / (1 / ov + 1 / un) if ov and un and line else None
            lh, la = fit(pm, float(line) if line else 2.5, pover)
            home, away = t["home"]["team"]["displayName"], t["away"]["team"]["displayName"]
            P = paris.probs(lh, la, RHO, home, away)
            M = paris.matrix(lh, la, RHO)
            i, j = np.unravel_index(M.argmax(), M.shape)
            is25 = line in (2.5, "2.5")
            out.append(dict(lg=lg, league=nom, country="Europe", top=False, cup=True, far=False, espn=e["id"], ko=ko.isoformat(),
                            date=ko.strftime("%d/%m/%Y"), time=ko.strftime("%H:%M"), home=home, away=away, odds=o, max=o,
                            market=pm, model=pm, lam=[lh, la], rho=RHO, cc=None, xg=[lh, la], o25=P["O2.5"][1], btts=P["BTTS"][1],
                            score=f"{i}-{j}", signal=None, thin=False, ao25=ov if is25 else None, au25=un if is25 else None,
                            ou=[float(line), ov, un] if pover is not None else None,
                            sure=paris.sure(lh, la, RHO, home, away, odds=o, ou=(ov, un) if is25 else None),
                            logos=[t["home"]["team"].get("logo"), t["away"]["team"].get("logo")]))
    return out
