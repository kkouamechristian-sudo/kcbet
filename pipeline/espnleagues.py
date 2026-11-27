"""Tous les championnats et coupes de clubs disponibles chez ESPN, en complement de football-data.
Avec cotes : probabilites du marche. Sans cotes : prevision tiree du classement actuel (buts marques et encaisses)."""
import glob, json, os, re, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import numpy as np
import espn, paris, cups

COUNTRY = {"arg": "Argentine", "aus": "Australie", "aut": "Autriche", "bel": "Belgique", "bol": "Bolivie", "bra": "Brésil", "chi": "Chili", "chn": "Chine",
           "col": "Colombie", "crc": "Costa Rica", "cyp": "Chypre", "cze": "Tchéquie", "den": "Danemark", "ecu": "Équateur", "eng": "Angleterre", "esp": "Espagne",
           "fra": "France", "ger": "Allemagne", "gha": "Ghana", "gre": "Grèce", "gua": "Guatemala", "hon": "Honduras", "ind": "Inde", "irl": "Irlande",
           "isr": "Israël", "ita": "Italie", "jpn": "Japon", "ken": "Kenya", "ksa": "Arabie saoudite", "mex": "Mexique", "ned": "Pays-Bas", "nga": "Nigeria",
           "nir": "Irlande du Nord", "nor": "Norvège", "par": "Paraguay", "per": "Pérou", "por": "Portugal", "rou": "Roumanie", "rsa": "Afrique du Sud",
           "rus": "Russie", "sco": "Écosse", "slv": "Salvador", "sui": "Suisse", "swe": "Suède", "tur": "Turquie", "uga": "Ouganda", "uru": "Uruguay",
           "usa": "États-Unis", "ven": "Venezuela", "wal": "Pays de Galles", "zam": "Zambie",
           "caf": "Afrique", "conmebol": "Amérique du Sud", "concacaf": "Amérique du Nord", "afc": "Asie"}
CONTINENTAL = {"caf.champions", "caf.confed", "conmebol.libertadores", "conmebol.sudamericana", "conmebol.recopa", "concacaf.champions", "concacaf.champions_cup",
               "afc.champions", "afc.cup"}
EXTRA = ["cze.1", "isr.1", "cyp.1", "nga.1", "gha.1", "ken.1", "zam.1", "uga.1", "rsa.2", "sui.1", "sui.2", "aut.2", "tur.2", "rou.1", "irl.1", "wal.1",
         "nir.1", "ksa.1", "den.1", "pol.1"]
SKIP = re.compile(r"(^|\.)w\.|\.w$|wchampions|nwsl|femenil|femenina|womens|_w_|u1\d|u2\d|ncaa|olymp|friendly|shebelieves|pinatar|arnold|emirates|gamper|\.reina|_qual|nonfifa")
DAYS = 10


def catalogue():
    try:
        with urllib.request.urlopen(urllib.request.Request("https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000", headers=espn.UA), timeout=40) as r:
            items = json.load(r)["items"]
        slugs = [re.search(r"/leagues/([^?]+)", it["$ref"]).group(1) for it in items]
    except Exception:
        slugs = []
    out = []
    for s in sorted(set(slugs + EXTRA)):
        if s.startswith(("uefa.", "fifa.", "global.")) or s in cups.SLUGS or SKIP.search(s):
            continue
        if s.split(".")[0] in COUNTRY and (s in CONTINENTAL or not s.split(".")[0] in ("caf", "conmebol", "concacaf", "afc")):
            out.append(s)
    return out


def collect(tmp, now):
    """Telecharge les matchs des prochains jours et les classements, en parallele."""
    slugs = catalogue()
    jobs = [(s, (now + timedelta(days=k)).strftime("%Y%m%d")) for s in slugs for k in range(DAYS)]

    def day(job):
        s, d = job
        try:
            j = espn.scoreboard(s, d)
            if j.get("events"):
                with open(os.path.join(tmp, f"ESP_{s}_{d}.json"), "w", encoding="utf-8") as f:
                    json.dump(j, f)
                return s
        except Exception:
            pass
        return None

    with ThreadPoolExecutor(12) as ex:
        active = {s for s in ex.map(day, jobs) if s}

    def standings(s):
        try:
            with urllib.request.urlopen(urllib.request.Request(f"https://site.api.espn.com/apis/v2/sports/soccer/{s}/standings", headers=espn.UA), timeout=30) as r:
                with open(os.path.join(tmp, f"STD_{s}.json"), "wb") as f:
                    f.write(r.read())
        except Exception:
            pass

    with ThreadPoolExecutor(8) as ex:
        list(ex.map(standings, active))
    print("championnats ESPN", len(slugs), "avec matchs", len(active))


def table(tmp, s):
    """Buts marques et encaisses par match pour chaque equipe du classement."""
    p = os.path.join(tmp, f"STD_{s}.json")
    if not os.path.exists(p):
        return {}
    with open(p, encoding="utf-8") as f:
        j = json.load(f)
    groups = j.get("children") or [j]
    out = {}
    for g in groups:
        for e in (g.get("standings") or {}).get("entries", []):
            st = {x.get("name"): x.get("value") for x in e.get("stats", [])}
            gp = st.get("gamesPlayed") or 0
            if gp >= 3:
                out[e["team"]["displayName"]] = (st.get("pointsFor", 0) / gp, st.get("pointsAgainst", 0) / gp, gp)
    return out


def info(raw, s):
    lg = (raw.get("leagues") or [{}])[0]
    return COUNTRY.get(s.split(".")[0], ""), lg.get("name") or s


def fixtures(tmp, today, existing, fd_slugs):
    """existing : matchs deja fournis par football-data ; fd_slugs : slug ESPN -> code football-data."""
    out, seen, tabs = [], set(), {}
    for path in sorted(glob.glob(os.path.join(tmp, "ESP_*.json"))):
        s = os.path.basename(path)[4:].rsplit("_", 1)[0]
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        pays, nom = info(raw, s)
        for e in raw.get("events", []):
            if e["id"] in seen or e.get("status", {}).get("type", {}).get("state") != "pre":
                continue
            c = e["competitions"][0]
            t = {x["homeAway"]: x for x in c["competitors"]}
            if "home" not in t or "away" not in t:
                continue
            seen.add(e["id"])
            ko = datetime.fromisoformat(e["date"].replace("Z", "+00:00"))
            if ko.date() < today:
                continue
            home, away = t["home"]["team"]["displayName"], t["away"]["team"]["displayName"]
            code = fd_slugs.get(s)
            if code and any(x["lg"] == code and espn.same_match(x["home"], x["away"], home, away)[0] for x in existing):
                continue
            lg = code or f"E_{s}"
            od = (c.get("odds") or [None])[0] or {}
            ml = od.get("moneyline") or {}
            o = [cups.pick(ml.get("home")), cups.pick(ml.get("draw")) or cups.dec((od.get("drawOdds") or {}).get("moneyLine")), cups.pick(ml.get("away"))]
            base = dict(lg=lg, league=nom if not code else None, country=pays, top=False, espn=e["id"], ko=ko.isoformat(), date=ko.strftime("%d/%m/%Y"),
                        time=ko.strftime("%H:%M"), home=home, away=away, cc=None, signal=None, thin=False, logos=[t["home"]["team"].get("logo"), t["away"]["team"].get("logo")])
            if all(x and x > 1 for x in o):
                inv = [1 / x for x in o]
                pm = [x / sum(inv) for x in inv]
                line = od.get("overUnder")
                tot = od.get("total") or {}
                ov, un = cups.pick(tot.get("over")), cups.pick(tot.get("under"))
                pover = (1 / ov) / (1 / ov + 1 / un) if ov and un and line else None
                lh, la = cups.fit(pm, float(line) if line else 2.5, pover)
                is25 = line in (2.5, "2.5")
                base.update(far=False, odds=o, max=o, market=pm, model=pm, ao25=ov if is25 else None, au25=un if is25 else None,
                            ou=[float(line), ov, un] if pover is not None else None, sure=paris.sure(lh, la, cups.RHO, home, away, odds=o, ou=(ov, un) if is25 else None))
            else:
                if s not in tabs:
                    tabs[s] = table(tmp, s)
                T = tabs[s]
                if home not in T or away not in T:
                    continue
                g = np.mean([v[0] for v in T.values()]) or 1.3
                sh = lambda v, n: (v * n + g * 5) / (n + 5)  # retrait vers la moyenne quand peu de matchs
                ah, dh = sh(T[home][0], T[home][2]) / g, sh(T[home][1], T[home][2]) / g
                aa, da = sh(T[away][0], T[away][2]) / g, sh(T[away][1], T[away][2]) / g
                lh, la = g * 1.12 * ah * da, g * 0.88 * aa * dh
                M = paris.matrix(lh, la, cups.RHO)
                pm = [float(np.tril(M, -1).sum()), float(np.trace(M)), float(np.triu(M, 1).sum())]
                base.update(far=True, est=True, odds=None, max=None, market=pm, model=pm, ao25=None, au25=None, ou=None,
                            sure=paris.sure(lh, la, cups.RHO, home, away))
            M = paris.matrix(lh, la, cups.RHO)
            i, j = np.unravel_index(M.argmax(), M.shape)
            P = paris.probs(lh, la, cups.RHO, home, away)
            base.update(lam=[lh, la], rho=cups.RHO, xg=[lh, la], o25=P["O2.5"][1], btts=P["BTTS"][1], score=f"{i}-{j}")
            out.append(base)
    return out
