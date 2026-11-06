"""Mise a jour de kcbet : telecharge les donnees, calcule, tient le registre public, ecrit site/data/app.json.
Le registre fige chaque pronostic avant le coup d'envoi ; il n'est jamais modifie ensuite, sauf pour ajouter le resultat.
Derniere ligne : STATUS=UNCHANGED ou STATUS=UPDATED. Toute erreur s'arrete sans ecraser les donnees en ligne.
Usage : python pipeline/update.py [--force]
"""
import csv, email.utils, json, os, re, shutil, subprocess, sys, tempfile, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_DATA = os.path.join(os.path.dirname(HERE), "site", "data")
STATE = os.path.join(SITE_DATA, "etat.json")
REG = os.path.join(SITE_DATA, "registre.json")
APP = os.path.join(SITE_DATA, "app.json")
BASE = "https://www.football-data.co.uk/"
LEAGUES = ["E0", "SP1", "D1", "I1", "F1"]
UA = {"User-Agent": "Mozilla/5.0"}
LONDON = ZoneInfo("Europe/London")


def get(url, dest=None):
    req = urllib.request.Request(url, headers=UA, method="GET" if dest else "HEAD")
    with urllib.request.urlopen(req, timeout=40) as r:
        lm = r.headers.get("Last-Modified", "")
        if dest:
            body = r.read()
            if not body.lstrip(b"\xef\xbb\xbf").startswith(b"Div,"):
                raise ValueError("contenu inattendu : " + url)
            with open(dest, "wb") as f:
                f.write(body)
    return lm


def code(y):
    return f"{y % 100:02d}{(y + 1) % 100:02d}"


def marks_for(start):
    urls = [BASE + "fixtures.csv"] + [BASE + f"mmz4281/{code(start)}/{l}.csv" for l in LEAGUES]
    return {u: get(u) for u in urls}


def pdate(s):
    for f in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, f)
        except ValueError:
            pass
    return None


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
        if f["id"] in known or ko <= now:
            continue
        i = max(range(3), key=lambda k: f["market"][k])
        reg.append(dict(id=f["id"], lg=f["lg"], league=f["league"], date=f["date"], ko=f["ko"], home=f["home"], away=f["away"],
                        created=now.isoformat(), big=f["market"][i] >= .73,
                        pick=dict(i=i, label=[f["home"], "Nul", f["away"]][i], p=f["market"][i], odds=f["odds"][i]),
                        signal=f["signal"], dc=f["model"], result=None, void=False))
        added += 1
    return added


def settle(reg, data, seasons, now):
    rows = {}
    for se in seasons:
        for lg in LEAGUES:
            with open(os.path.join(data, f"{se}_{lg}.csv"), encoding="utf-8-sig", errors="replace", newline="") as f:
                for r in csv.DictReader(f):
                    d = pdate(r.get("Date", ""))
                    if d and r.get("FTHG") not in ("", None) and r.get("HomeTeam"):
                        rows[(lg, d.date(), r["HomeTeam"], r["AwayTeam"])] = (int(float(r["FTHG"])), int(float(r["FTAG"])))
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
        for s in seasons:
            for l in LEAGUES:
                get(BASE + f"mmz4281/{s}/{l}.csv", os.path.join(tmp, f"{s}_{l}.csv"))
        iso = email.utils.parsedate_to_datetime(fetched).isoformat() if fetched else now.isoformat()
        out = os.path.join(tmp, "model.json")
        subprocess.run([sys.executable, os.path.join(HERE, "model.py"), tmp, out, iso, ",".join(seasons)],
                       check=True, timeout=900, stdout=subprocess.DEVNULL)
        with open(out, encoding="utf-8") as f:
            d = json.load(f)
        if d["n_pred"] < 2000 or d["metrics"]["test"]["n"] < 1:
            raise RuntimeError("donnees insuffisantes, mise a jour annulee")
        reg = load_json(REG, [])
        added = register(reg, d["fixtures"], now)
        settled = settle(reg, tmp, seasons, now)
        d["generated"] = now.isoformat()
        d["registre"] = sorted(reg, key=lambda x: x["ko"], reverse=True)[:400]
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
