"""Mise a jour de kcbet : telecharge les donnees, calcule, tient le registre public, ecrit site/data/app.json.
Le registre fige chaque pronostic avant le coup d'envoi ; il n'est jamais modifie ensuite, sauf pour ajouter le resultat.
Derniere ligne : STATUS=UNCHANGED ou STATUS=UPDATED. Toute erreur s'arrete sans ecraser les donnees en ligne.
Usage : python pipeline/update.py [--force]
"""
import email.utils, glob, json, os, re, shutil, subprocess, sys, tempfile, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import leagues as L

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_DATA = os.path.join(os.path.dirname(HERE), "site", "data")
STATE = os.path.join(SITE_DATA, "etat.json")
REG = os.path.join(SITE_DATA, "registre.json")
APP = os.path.join(SITE_DATA, "app.json")
BASE = "https://www.football-data.co.uk/"
CAL = "https://raw.githubusercontent.com/openfootball/football.json/master"
UA = {"User-Agent": "Mozilla/5.0"}
LONDON = ZoneInfo("Europe/London")


def get(url, dest=None):
    req = urllib.request.Request(url, headers=UA, method="GET" if dest else "HEAD")
    with urllib.request.urlopen(req, timeout=40) as r:
        lm = r.headers.get("Last-Modified", "")
        if dest:
            body = r.read()
            if not body.lstrip(b"\xef\xbb\xbf").startswith((b"Div,", b"Country,")):
                raise ValueError("contenu inattendu : " + url)
            with open(dest, "wb") as f:
                f.write(body)
    return lm


def code(y):
    return f"{y % 100:02d}{(y + 1) % 100:02d}"


def fetch_json(url, dest):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        body = r.read()
    json.loads(body)
    with open(dest, "wb") as f:
        f.write(body)


def marks_for(start):
    urls = [BASE + "fixtures.csv", BASE + "new_league_fixtures.csv"] + [BASE + f"mmz4281/{code(start)}/{l}.csv" for l in L.TOP5]
    marks = {u: get(u) for u in urls}
    for u in [BASE + f"mmz4281/{code(start)}/{l}.csv" for l in L.MAIN if l not in L.TOP5] + [BASE + f"new/{c}.csv" for c in L.NEW]:
        try:
            marks[u] = get(u)
        except urllib.error.URLError:
            marks[u] = "absent"
    return marks


pdate = L.pdate


def rnd(o):
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, dict):
        return {k: rnd(v) for k, v in o.items()}
    if isinstance(o, list):
        return [rnd(v) for v in o]
    return o


def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path, data):
    t = path + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, path)


def mid(f):
    return re.sub(r"[^A-Za-z0-9]", "", f"{f['date']}{f['home']}{f['away']}")


def register(reg, fixtures, now):
    known = {r["id"] for r in reg}
    added = 0
    for f in fixtures:
        d = pdate(f["date"])
        hh, mm = (f["time"] or "12:00").split(":")[:2]
        ko = d.replace(hour=int(hh), minute=int(mm), tzinfo=LONDON).astimezone(timezone.utc)
        f["id"] = mid(f)
        f["ko"] = ko.isoformat()
        if f["far"] or f["id"] in known or ko <= now:
            continue
        i = max(range(3), key=lambda k: f["market"][k])
        reg.append(dict(id=f["id"], lg=f["lg"], league=f["league"], country=f["country"], date=f["date"], ko=f["ko"], home=f["home"], away=f["away"],
                        created=now.isoformat(), big=f["market"][i] >= .73,
                        pick=dict(i=i, label=[f["home"], "Nul", f["away"]][i], p=f["market"][i], odds=f["odds"][i]),
                        signal=f["signal"], dc=f["model"], result=None, void=False))
        added += 1
    return added


def settle(reg, data, now):
    rows = {}
    for path in glob.glob(os.path.join(data, "*.csv")):
        name = os.path.basename(path)[:-4]
        if "_" not in name or name.startswith(("fixtures", "new_league")):
            continue
        lg = name.split("_", 1)[1]
        for r in L.rows_of(path):
            d = pdate(r.get("Date", ""))
            h, a = r.get("HomeTeam") or r.get("Home"), r.get("AwayTeam") or r.get("Away")
            g1, g2 = r.get("FTHG", r.get("HG")), r.get("FTAG", r.get("AG"))
            if d and h and a and g1 not in ("", None) and g2 not in ("", None):
                rows[(lg, d.date(), h, a)] = (int(float(g1)), int(float(g2)))
    n = 0
    for x in reg:
        if x["result"] or x["void"]:
            continue
        s = rows.get((x["lg"], pdate(x["date"]).date(), x["home"], x["away"]))
        if s:
            hg, ag = s
            res = 0 if hg > ag else 2 if ag > hg else 1
            win = {"1": res == 0, "X": res == 1, "2": res == 2, "Plus de 2,5 buts": hg + ag > 2, "Moins de 2,5 buts": hg + ag < 3}
            x["result"] = dict(hg=hg, ag=ag, pick=res == x["pick"]["i"], signal=win[x["signal"]["label"]] if x["signal"] else None)
            n += 1
        elif now - datetime.fromisoformat(x["ko"]) > timedelta(days=14):
            x["void"] = True  # match reporte ou annule : exclu des comptes, reste visible
    return n


def stat(rows):
    if not rows:
        return dict(n=0)
    pnl = [(o - 1) if w else -1.0 for o, w in rows]
    return dict(n=len(rows), wins=sum(w for _, w in rows), hit=sum(w for _, w in rows) / len(rows),
                avg_odds=sum(o for o, _ in rows) / len(rows), roi=sum(pnl) / len(rows))


def stats(reg):
    done = [x for x in reg if x["result"]]
    out = dict(pick=stat([(x["pick"]["odds"], x["result"]["pick"]) for x in done]),
               signal=stat([(x["signal"]["odds"], x["result"]["signal"]) for x in done if x["signal"]]),
               big=stat([(x["pick"]["odds"], x["result"]["pick"]) for x in done if x["big"]]), leagues=[])
    for lg in sorted({x["league"] for x in done}):
        out["leagues"].append(dict(league=lg, **stat([(x["pick"]["odds"], x["result"]["pick"]) for x in done if x["league"] == lg])))
    return out


def main():
    now = datetime.now(timezone.utc)
    start = now.year if now.month >= 8 else now.year - 1
    try:
        marks = marks_for(start)
    except Exception:
        if now.month not in (8, 9):
            raise
        start -= 1  # debut de saison : nouveaux fichiers pas encore publies
        marks = marks_for(start)
    if load_json(STATE, {}).get("marks") == marks and "--force" not in sys.argv:
        print("Aucune nouvelle donnee.")
        print("STATUS=UNCHANGED")
        return
    tmp = tempfile.mkdtemp(prefix="kcbet_")
    try:
        seasons = [code(start - 2), code(start - 1), code(start)]
        fetched = get(BASE + "fixtures.csv", os.path.join(tmp, "fixtures.csv"))
        get(BASE + "new_league_fixtures.csv", os.path.join(tmp, "new_league_fixtures.csv"))
        for s in seasons:
            for l in L.MAIN:
                try:
                    get(BASE + f"mmz4281/{s}/{l}.csv", os.path.join(tmp, f"{s}_{l}.csv"))
                except (urllib.error.URLError, ValueError):
                    if l in L.TOP5:
                        raise
        for c in L.NEW:
            try:
                get(BASE + f"new/{c}.csv", os.path.join(tmp, f"NEW_{c}.csv"))
            except (urllib.error.URLError, ValueError):
                print("indisponible", c)
        for lg, (annee, nom) in L.CALENDARS.items():
            dossier = str(now.year) if annee else f"{start}-{(start + 1) % 100:02d}"
            try:
                fetch_json(f"{CAL}/{dossier}/{nom}.json", os.path.join(tmp, f"CAL_{lg}.json"))
            except (urllib.error.URLError, ValueError):
                print("calendrier indisponible", lg)
        iso = email.utils.parsedate_to_datetime(fetched).isoformat() if fetched else now.isoformat()
        out = os.path.join(tmp, "model.json")
        subprocess.run([sys.executable, os.path.join(HERE, "model.py"), tmp, out, iso, ",".join(seasons)],
                       check=True, timeout=1500)
        with open(out, encoding="utf-8") as f:
            d = json.load(f)
        if d["n_pred"] < 2000 or d["metrics"]["test"]["n"] < 1:
            raise RuntimeError("donnees insuffisantes, mise a jour annulee")
        reg = load_json(REG, [])
        added = register(reg, d["fixtures"], now)
        settled = settle(reg, tmp, now)
        d["generated"] = now.isoformat()
        d["registre"] = sorted(reg, key=lambda x: x["ko"], reverse=True)[:600]
        d["suivi"] = stats(reg)
        os.makedirs(SITE_DATA, exist_ok=True)
        save_json(REG, rnd(reg))
        save_json(APP, rnd(d))
        save_json(STATE, dict(marks=marks, at=now.isoformat()))
        print(f"{len(d['fixtures'])} matchs, {added} pronostics ajoutes, {settled} resultats, dernier resultat {d['last_result']}.")
        print("STATUS=UPDATED")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


main()
