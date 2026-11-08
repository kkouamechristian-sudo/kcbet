"""Selections nationales : classement Elo depuis l'historique martj42, buts attendus, matchs a venir lus chez ESPN."""
import csv, glob, json, math, os
from datetime import datetime
import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson
import espn, paris

COMPS = {"uefa.nations": ("INT_UNL", "Ligue des nations UEFA"), "caf.nations_qual": ("INT_CANQ", "Qualifications CAN"),
         "concacaf.nations.league": ("INT_CNL", "Ligue des nations CONCACAF"), "fifa.friendly": ("INT_AMI", "Matchs amicaux"),
         "fifa.worldq.caf": ("INT_WCQ_CAF", "Qualifications Coupe du monde, Afrique"), "fifa.worldq.uefa": ("INT_WCQ_UEFA", "Qualifications Coupe du monde, Europe")}
ALIAS = {"Bosnia-Herzegovina": "Bosnia and Herzegovina", "Congo DR": "DR Congo", "Czechia": "Czech Republic", "Türkiye": "Turkey", "Kyrgyz Republic": "Kyrgyzstan",
         "St. Kitts and Nevis": "Saint Kitts and Nevis", "St. Lucia": "Saint Lucia", "St. Martin": "Saint Martin", "St. Vincent and the Grenadines": "Saint Vincent and the Grenadines",
         "Chinese Taipei": "Taiwan", "Cape Verde Islands": "Cape Verde", "USA": "United States", "Korea Republic": "South Korea", "IR Iran": "Iran", "Côte d'Ivoire": "Ivory Coast"}


def weight(t):
    t = t.lower()
    if t == "fifa world cup":
        return 60
    if "qualification" in t or "nations league" in t:
        return 40
    if t == "friendly":
        return 20
    return 50 if t in ("african cup of nations", "uefa euro", "copa américa", "afc asian cup", "gold cup") else 30


def ratings(path):
    rows = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if r["date"] >= "2004-01-01" and r["home_score"] not in ("", "NA"):
                rows.append(r)
    R, hist = {}, []
    for r in rows:
        h, a = r["home_team"], r["away_team"]
        hg, ag = int(r["home_score"]), int(r["away_score"])
        rh, ra = R.get(h, 1500.0), R.get(a, 1500.0)
        d = rh - ra + (0 if r["neutral"] == "TRUE" else 100)
        hist.append((r["date"], d, hg, ag))
        we = 1 / (1 + 10 ** (-d / 400))
        w = 1.0 if hg > ag else .5 if hg == ag else 0.0
        gd = abs(hg - ag)
        mult = 1 if gd <= 1 else 1.5 if gd == 2 else (11 + gd) / 8
        k = weight(r["tournament"]) * mult * (w - we)
        R[h], R[a] = rh + k, ra - k
    return R, hist


def fit(hist):
    d = np.array([x[1] for x in hist]) / 400
    hg = np.array([x[2] for x in hist])
    ag = np.array([x[3] for x in hist])

    def nll(p):
        a, b = p
        return -(poisson.logpmf(hg, np.exp(a + b * d)).sum() + poisson.logpmf(ag, np.exp(a - b * d)).sum())
    return minimize(nll, [0.2, 0.5], method="Nelder-Mead").x


def lams(par, d):
    a, b = par
    return math.exp(a + b * d / 400), math.exp(a - b * d / 400)


def test(hist, cut="2025-11-01"):
    """Ajuste sur les matchs avant cut, mesure l'erreur 1 X 2 apres cut, comparee a des frequences fixes."""
    tr = [x for x in hist if "2015-01-01" <= x[0] < cut]
    te = [x for x in hist if x[0] >= cut]
    par = fit(tr)
    base = [sum(x[2] > x[3] for x in tr) / len(tr), sum(x[2] == x[3] for x in tr) / len(tr), sum(x[2] < x[3] for x in tr) / len(tr)]
    ll = llb = 0.0
    for _, d, hg, ag in te:
        M = paris.matrix(*lams(par, d))
        p = [np.tril(M, -1).sum(), np.trace(M), np.triu(M, 1).sum()]
        k = 0 if hg > ag else 1 if hg == ag else 2
        ll -= math.log(max(p[k], 1e-9))
        llb -= math.log(base[k])
    return dict(n=len(te), ll=ll / len(te), ll_base=llb / len(te))


def fixtures(data, today):
    path = os.path.join(data, "intl_results.csv")
    if not os.path.exists(path):
        return [], None
    R, hist = ratings(path)
    par = fit([x for x in hist if x[0] >= "2015-01-01"])
    known = set(R)
    out, seen = [], set()
    for p in sorted(glob.glob(os.path.join(data, "INTL_*.json"))):
        slug = os.path.basename(p)[5:].rsplit("_", 1)[0]
        lg, nom = COMPS[slug]
        with open(p, encoding="utf-8") as f:
            evs = espn.events(json.load(f))
        for e in evs:
            if e["state"] != "pre" or e["id"] in seen:
                continue
            seen.add(e["id"])
            h, a = ALIAS.get(e["home"], e["home"]), ALIAS.get(e["away"], e["away"])
            if h not in known or a not in known:
                print("selection inconnue", e["home"], e["away"])
                continue
            ko = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
            if ko.date() < today:
                continue
            d = R[h] - R[a] + (0 if slug == "fifa.friendly" else 100)
            lh, la = lams(par, d)
            M = paris.matrix(lh, la)
            pk = [float(np.tril(M, -1).sum()), float(np.trace(M)), float(np.triu(M, 1).sum())]
            P = paris.probs(lh, la, 0, e["home"], e["away"])
            i, j = np.unravel_index(M.argmax(), M.shape)
            out.append(dict(lg=lg, league=nom, country="Sélections", top=False, far=True, intl=True, espn=e["id"], ko=ko.isoformat(),
                            date=ko.strftime("%d/%m/%Y"), time=ko.strftime("%H:%M"), home=e["home"], away=e["away"], odds=None, max=None,
                            market=pk, model=pk, lam=[lh, la], rho=0.0, cc=None, xg=[lh, la], o25=P["O2.5"][1], btts=P["BTTS"][1], score=f"{i}-{j}",
                            signal=None, thin=False, ao25=None, au25=None, sure=paris.sure(lh, la, 0, e["home"], e["away"]),
                            elo=[round(R[h]), round(R[a])], logos=[e.get("hlogo"), e.get("alogo")]))
    return out, test(hist)
