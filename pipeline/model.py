"""Modele walk-forward : forces equipes (Poisson decroissant) + melange avec le marche.
Aucun match n'est predit avec une information posterieure a son coup d'envoi.
Usage: python -I model.py <dossier_data> <sortie.json>
"""
import csv, json, math, os, random, sys
from collections import defaultdict
from datetime import datetime

DATA, OUT = sys.argv[1], sys.argv[2]
FETCHED = sys.argv[3] if len(sys.argv) > 3 else ""
LEAGUES = {"E0": "Premier League", "SP1": "LaLiga", "D1": "Bundesliga", "I1": "Serie A", "F1": "Ligue 1"}
SEASONS = sys.argv[4].split(",") if len(sys.argv) > 4 else ["2425", "2526", "2627"]
HALF_LIFE = 180.0   # jours
PRIOR_K = 4.0       # matchs fictifs de retrait vers la moyenne
XG_W = 0.6          # part du xG quand il est disponible
RHO = -0.08         # correction Dixon-Coles des petits scores
MAXG = 9
DC_PATH = os.path.dirname(os.path.abspath(__file__))


def num(x):
    try:
        v = float(x)
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


def date(s):
    for f in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, f)
        except ValueError:
            pass
    return None


def read(path):
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def odds_triplet(r, *prefixes):
    for p in prefixes:
        t = [num(r.get(p + s)) for s in "HDA"]
        if all(t):
            return t
    return None


def load():
    ms = []
    for se in SEASONS:
        for lg in LEAGUES:
            for r in read(os.path.join(DATA, f"{se}_{lg}.csv")):
                if not r.get("HomeTeam") or r.get("FTHG") in (None, ""):
                    continue
                d = date(r["Date"])
                if d is None:
                    continue
                pre = odds_triplet(r, "Avg", "B365")
                if pre is None:
                    continue
                hg, ag = int(float(r["FTHG"])), int(float(r["FTAG"]))
                try:
                    hx, ax = float(r.get("HxG") or ""), float(r.get("AxG") or "")
                except ValueError:
                    hx, ax = None, None
                ms.append(dict(season=se, lg=lg, d=d, home=r["HomeTeam"], away=r["AwayTeam"], hg=hg, ag=ag,
                               hx=hx, ax=ax, ftr=r["FTR"], pre=pre, mx=odds_triplet(r, "Max") or pre,
                               close=odds_triplet(r, "AvgC", "B365C"),
                               o25=num(r.get("Avg>2.5")), u25=num(r.get("Avg<2.5"))))
    ms.sort(key=lambda m: (m["d"], m["lg"]))
    return ms


def fit(history, at):
    """Forces attaque/defense ponderees par l'anciennete, jusqu'a la date `at` exclue."""
    if not history:
        return None
    rows = []
    for m in history:
        w = 0.5 ** ((at - m["d"]).days / HALF_LIFE)
        gh = m["hg"] if m["hx"] is None else XG_W * m["hx"] + (1 - XG_W) * m["hg"]
        ga = m["ag"] if m["ax"] is None else XG_W * m["ax"] + (1 - XG_W) * m["ag"]
        rows.append((m["home"], m["away"], gh, ga, w))
    wt = sum(r[4] for r in rows)
    mu_h = sum(r[2] * r[4] for r in rows) / wt
    mu_a = sum(r[3] * r[4] for r in rows) / wt
    teams = {t for r in rows for t in r[:2]}
    att = {t: 1.0 for t in teams}
    dfn = {t: 1.0 for t in teams}
    for _ in range(12):
        num_a, den_a = defaultdict(float), defaultdict(float)
        for h, a, gh, ga, w in rows:
            num_a[h] += w * gh
            den_a[h] += w * mu_h * dfn[a]
            num_a[a] += w * ga
            den_a[a] += w * mu_a * dfn[h]
        att = {t: (num_a[t] + PRIOR_K * 1.0 * 1.3) / (den_a[t] + PRIOR_K * 1.3) for t in teams}
        num_d, den_d = defaultdict(float), defaultdict(float)
        for h, a, gh, ga, w in rows:
            num_d[a] += w * gh
            den_d[a] += w * mu_h * att[h]
            num_d[h] += w * ga
            den_d[h] += w * mu_a * att[a]
        dfn = {t: (num_d[t] + PRIOR_K * 1.3) / (den_d[t] + PRIOR_K * 1.3) for t in teams}
        ma = sum(att.values()) / len(att)
        md = sum(dfn.values()) / len(dfn)
        att = {t: v / ma for t, v in att.items()}
        dfn = {t: v / md for t, v in dfn.items()}
    return dict(mu_h=mu_h, mu_a=mu_a, att=att, dfn=dfn)


def pois(l):
    p = [math.exp(-l)]
    for k in range(1, MAXG + 1):
        p.append(p[-1] * l / k)
    return p


def score_probs(lh, la):
    ph, pa = pois(lh), pois(la)
    out = {"H": 0.0, "D": 0.0, "A": 0.0, "o25": 0.0, "btts": 0.0}
    best, top = (0, 0), -1
    tot = 0.0
    for i, x in enumerate(ph):
        for j, y in enumerate(pa):
            p = x * y
            if i == 0 and j == 0:
                p *= 1 - lh * la * RHO
            elif i == 0 and j == 1:
                p *= 1 + lh * RHO
            elif i == 1 and j == 0:
                p *= 1 + la * RHO
            elif i == 1 and j == 1:
                p *= 1 - RHO
            tot += p
            out["H" if i > j else "A" if j > i else "D"] += p
            if i + j > 2:
                out["o25"] += p
            if i and j:
                out["btts"] += p
            if p > top:
                top, best = p, (i, j)
    for k in out:
        out[k] /= tot
    out["score"] = f"{best[0]}-{best[1]}"
    return out


def predict(s, h, a):
    if s is None:
        return None
    # une equipe inconnue (promue) est traitee comme une equipe faible de la ligue
    ah, dh = s["att"].get(h, 0.85), s["dfn"].get(h, 1.15)
    aa, da = s["att"].get(a, 0.85), s["dfn"].get(a, 1.15)
    lh, la = s["mu_h"] * ah * da, s["mu_a"] * aa * dh
    r = score_probs(max(lh, .05), max(la, .05))
    r["lh"], r["la"] = lh, la
    return r


def devig(o):
    inv = [1 / x for x in o]
    t = sum(inv)
    return [x / t for x in inv]


def blend(pm, pk, b):
    v = [(1 - b) * math.log(x) + b * math.log(y) for x, y in zip(pm, pk)]
    e = [math.exp(x) for x in v]
    t = sum(e)
    return [x / t for x in e]


def ll(p, i):
    return -math.log(max(p[i], 1e-9))


def run():
    ms = load()
    print("matchs", len(ms), {s: sum(m["season"] == s for m in ms) for s in SEASONS},
          "xG", sum(m["hx"] is not None for m in ms))
    hist = defaultdict(list)
    preds = []
    by_day = defaultdict(list)
    for m in ms:
        by_day[(m["d"], m["lg"])].append(m)
    for (d, lg), day in sorted(by_day.items(), key=lambda kv: kv[0][0]):
        s = fit(hist[lg][-1000:], d) if len(hist[lg]) >= 150 else None
        for m in day:
            p = predict(s, m["home"], m["away"])
            if p:
                m["pm"] = devig(m["pre"])
                m["pk"] = [p["H"], p["D"], p["A"]]
                m["res"] = "HDA".index(m["ftr"])
                preds.append(m)
        hist[lg].extend(day)
    print("predits", len(preds))
    return ms, hist, preds


def strat(ms, pick, key="pre"):
    """Mise fixe de 1 ; retourne les paris (gain net) a la cote moyenne d'avant-match ou a la meilleure cote."""
    bets = []
    for m in ms:
        i = pick(m)
        if i is None:
            continue
        o = m[key][i]
        bets.append(dict(o=o, win=i == m["res"], pnl=(o - 1) if i == m["res"] else -1.0))
    return bets


def summary(bets, seed=7):
    n = len(bets)
    if not n:
        return dict(n=0)
    pnl = [b["pnl"] for b in bets]
    roi = sum(pnl) / n
    rnd = random.Random(seed)
    boots = sorted(sum(rnd.choices(pnl, k=n)) / n for _ in range(2000))
    return dict(n=n, wins=sum(b["win"] for b in bets), hit=sum(b["win"] for b in bets) / n,
                avg_odds=sum(b["o"] for b in bets) / n, roi=roi, lo=boots[100], hi=boots[1899])


def main():
    ms, hist, preds = run()
    tr = [m for m in preds if m["season"] != SEASONS[-1]]
    te = [m for m in preds if m["season"] == SEASONS[-1]]
    print("train", len(tr), "test", len(te))
    # poids du modele choisi sur les saisons passees uniquement
    grid = [i / 20 for i in range(0, 13)]
    scores = {b: sum(ll(blend(m["pm"], m["pk"], b), m["res"]) for m in tr) / len(tr) for b in grid}
    b = min(scores, key=scores.get)
    print("log-loss selon poids", {k: round(v, 4) for k, v in scores.items()}, "=>", b)
    res = {}
    for name, S in (("train", tr), ("test", te)):
        res[name] = dict(
            n=len(S),
            ll_market=sum(ll(m["pm"], m["res"]) for m in S) / len(S),
            ll_model=sum(ll(m["pk"], m["res"]) for m in S) / len(S),
            ll_blend=sum(ll(blend(m["pm"], m["pk"], b), m["res"]) for m in S) / len(S),
        )
    def fav(m):
        i = max(range(3), key=lambda k: m["pm"][k])
        return i
    def banker(th):
        return lambda m: (fav(m) if m["pm"][fav(m)] >= th else None)
    def value(th, source):
        def f(m):
            p = blend(m["pm"], m["pk"], b) if source == "blend" else m["pk"]
            ev = [p[k] * m["pre"][k] - 1 for k in range(3)]
            i = max(range(3), key=lambda k: ev[k])
            return i if ev[i] >= th else None
        return f
    def best(th):
        def f(m):
            ev = [m["pm"][k] * m["mx"][k] - 1 for k in range(3)]
            i = max(range(3), key=lambda k: ev[k])
            return i if ev[i] >= th else None
        return f
    table = []
    for label, fn, key in (("Meilleure cote, avantage >= 2 %", best(.02), "mx"), ("Meilleure cote, avantage >= 4 %", best(.04), "mx")):
        row = dict(label=label, train=summary(strat(tr, fn, key)), test=summary(strat(te, fn, key)), all=summary(strat(tr + te, fn, key)))
        table.append(row)
        print(label, row["train"], row["test"])
    print(res)
    for label, fn in (("Toujours le favori", lambda m: fav(m)),
                      ("Gros favoris (proba marche >= 73 %)", banker(.73)),
                      ("Modele seul, avantage >= 5 %", value(.05, "model")),
                      ("Modele seul, avantage >= 10 %", value(.10, "model")),
                      ("Modele + marche, avantage >= 2 %", value(.02, "blend")),
                      ("Modele + marche, avantage >= 5 %", value(.05, "blend"))):
        row = dict(label=label, train=summary(strat(tr, fn)), test=summary(strat(te, fn)),
                   all=summary(strat(tr + te, fn)))
        table.append(row)
        print(label, {k: {x: round(y, 3) if isinstance(y, float) else y for x, y in row[k].items()} for k in ("train", "test")})
    # calibration des probabilites melangees, hors echantillon : saison courante + 2025-26
    bins = defaultdict(lambda: [0, 0, 0.0])
    S = tr + te
    for m in S:
        p = blend(m["pm"], m["pk"], b)
        for k in range(3):
            q = min(int(p[k] * 10), 8)
            bins[q][0] += 1
            bins[q][1] += m["res"] == k
            bins[q][2] += p[k]
    calib = [dict(lo=q / 10, hi=(q + 1) / 10 if q < 8 else 1.0, n=v[0], pred=v[2] / v[0], obs=v[1] / v[0]) for q, v in sorted(bins.items())]
    print(calib)
    # matchs a venir, tous championnats
    fx = []
    now = max(m["d"] for m in ms)
    sys.path.insert(0, DC_PATH)
    import warnings
    warnings.filterwarnings("ignore")
    import pandas as pd
    from datetime import timedelta
    from dixon_coles_ha import DixonColesHA
    import leagues as L
    today = datetime.now().date()
    wanted = set()
    rows = []
    for r in read(os.path.join(DATA, "fixtures.csv")):
        if r.get("Div") in L.MAIN and r.get("HomeTeam"):
            rows.append(dict(lg=r["Div"], Date=r["Date"], Time=r["Time"], home=r["HomeTeam"], away=r["AwayTeam"], o=odds_triplet(r, "Avg", "B365"),
                             mx=odds_triplet(r, "Max"), ao=num(r.get("Avg>2.5")), au=num(r.get("Avg<2.5"))))
    src = {(v[0], v[1]): k for k, v in L.NEW.items()}
    nlf = os.path.join(DATA, "new_league_fixtures.csv")
    if os.path.exists(nlf):
        for r in read(nlf):
            c = src.get((r.get("Country"), r.get("League")))
            if c and r.get("Home"):
                rows.append(dict(lg=c, Date=r["Date"], Time=r["Time"], home=r["Home"], away=r["Away"], o=odds_triplet(r, "Avg", "B365"), mx=odds_triplet(r, "Max"), ao=None, au=None))
    rows = [r for r in rows if r["o"] and date(r["Date"]) and date(r["Date"]).date() >= today]
    with open(os.path.join(DC_PATH, "noms.json"), encoding="utf-8") as f:
        noms = json.load(f)
    far = []
    limit = today + timedelta(days=21)
    for lg in L.CALENDARS:
        for m in L.calendar_rows(DATA, lg):
            if m.get("score") or not m.get("date"):
                continue
            d = datetime.strptime(m["date"], "%Y-%m-%d")
            h, a = noms.get(lg, {}).get(m.get("team1")), noms.get(lg, {}).get(m.get("team2"))
            if today <= d.date() <= limit and h and a:
                far.append(dict(lg=lg, Date=d.strftime("%d/%m/%Y"), Time=m.get("time") or "12:00", home=h, away=a))
    done = {(r["lg"], r["home"], r["away"]) for r in rows}
    far = [r for r in far if (r["lg"], r["home"], r["away"]) not in done]
    dcm, seen = {}, {}
    for lg in sorted({r["lg"] for r in rows + far}):
        H = hist[lg][-1000:] if lg in L.TOP5 else L.history(DATA, lg, SEASONS)
        if len(H) < 100:
            print("historique trop court", lg, len(H))
            continue
        dcm[lg] = DixonColesHA()
        dcm[lg].fit(pd.DataFrame([dict(date=x["d"], home_team=x["home"], away_team=x["away"], home_goals=x["hg"], away_goals=x["ag"]) for x in H]))
        seen[lg] = defaultdict(int)
        for x in H:
            seen[lg][x["home"]] += 1
            seen[lg][x["away"]] += 1

    def prob(r):
        mod = dcm.get(r["lg"])
        if not mod or r["home"] not in mod.team_to_idx or r["away"] not in mod.team_to_idx:
            print("match ignore", r["lg"], r["home"], r["away"])
            return None
        q = mod.predict(r["home"], r["away"])
        return dict(pk=[float(q["1"]), float(q["X"]), float(q["2"])], lh=float(q["lambda_home"]), la=float(q["mu_away"]), o25=float(q["Over 2.5"]), btts=float(q["BTTS Oui"]),
                    score=f"{q['top_scores'][0][0]}-{q['top_scores'][0][1]}")

    for r in rows:
        p = prob(r)
        if not p:
            continue
        lg, o, pk = r["lg"], r["o"], p["pk"]
        cand = [(pk[i] * o[i] - 1, ["1", "X", "2"][i], pk[i], o[i]) for i in range(3)]
        if r["ao"] and r["au"]:
            cand += [(p["o25"] * r["ao"] - 1, "Plus de 2,5 buts", p["o25"], r["ao"]), ((1 - p["o25"]) * r["au"] - 1, "Moins de 2,5 buts", 1 - p["o25"], r["au"])]
        cand = [c for c in cand if .05 <= c[0] <= .20]
        thin = min(seen[lg][r["home"]], seen[lg][r["away"]]) < 10
        sig = None
        if cand and not thin:
            e, lab_, pp, oo = max(cand)
            sig = dict(edge=e, label=lab_, p=pp, odds=oo)
        pays, nom = L.info(lg)
        fx.append(dict(lg=lg, league=nom, country=pays, top=lg in L.TOP5, far=False, date=r["Date"], time=r["Time"], home=r["home"], away=r["away"],
                       odds=o, max=r["mx"] or o, market=devig(o), model=pk, xg=[p["lh"], p["la"]], o25=p["o25"], btts=p["btts"], score=p["score"],
                       signal=sig, thin=thin, ao25=r["ao"], au25=r["au"]))
    for r in far:
        p = prob(r)
        if not p:
            continue
        lg = r["lg"]
        pays, nom = L.info(lg)
        fx.append(dict(lg=lg, league=nom, country=pays, top=lg in L.TOP5, far=True, date=r["Date"], time=r["Time"], home=r["home"], away=r["away"],
                       odds=None, max=None, market=p["pk"], model=p["pk"], xg=[p["lh"], p["la"]], o25=p["o25"], btts=p["btts"], score=p["score"],
                       signal=None, thin=min(seen[lg][r["home"]], seen[lg][r["away"]]) < 10, ao25=None, au25=None))
    fx.sort(key=lambda f: (date(f["date"]), f["time"]))
    lab = lambda z: f"20{z[:2]}-{z[2:]}"
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "dc_test.json"), encoding="utf-8") as f:
        dc = json.load(f)
    out = dict(dc=dc, fetched=FETCHED, test_label=lab(SEASONS[-1]), first_label=lab(SEASONS[0]), mid_label=lab(SEASONS[1]), first_eval=f"20{SEASONS[1][:2]}", weight=b, metrics=res, table=table, calib=calib, fixtures=fx, last_result=now.strftime("%Y-%m-%d"),
               n_matches=len(ms), n_pred=len(preds), n_xg=sum(m["hx"] is not None for m in ms),
               params=dict(half_life=HALF_LIFE, xg_w=XG_W, prior_k=PRIOR_K, rho=RHO))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print("fixtures", len(fx))


main()
