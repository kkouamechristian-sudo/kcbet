"""Lecture des tableaux de scores ESPN (acces public non officiel) et rapprochement des noms d'equipes."""
import json, re, unicodedata, urllib.request

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/"
UA = {"User-Agent": "Mozilla/5.0"}
STOP = r"\b(fc|afc|cf|sc|ac|as|ssc|sv|vfb|vfl|tsg|rc|ud|cd|ca|sd|fk|club|de|the|city|united|town|real|atletico|ath|athletic|rj|mg|pr)\b"


def scoreboard(slug, day):
    with urllib.request.urlopen(urllib.request.Request(f"{BASE}{slug}/scoreboard?dates={day}", headers=UA), timeout=30) as r:
        return json.load(r)


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return " ".join(re.sub(STOP, " ", s).split())


def _bi(s):
    t = s.replace(" ", "")
    return {t[i:i + 2] for i in range(len(t) - 1)}


def sim(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    if a == b or a in b or b in a:
        return 1.0
    x, y = _bi(a), _bi(b)
    return 2 * len(x & y) / (len(x) + len(y)) if x or y else 0.0


def same_match(h1, a1, h2, a2):
    s, t = sim(h1, h2), sim(a1, a2)
    return (max(s, t) >= .7 or min(s, t) >= .5), s + t


def events(d):
    """Matchs d'un tableau ESPN au format commun."""
    out = []
    for e in d.get("events", []):
        c = e["competitions"][0]
        t = {x["homeAway"]: x for x in c["competitors"]}
        if "home" not in t or "away" not in t:
            continue
        st = e.get("status", {}).get("type", {})
        out.append(dict(id=e["id"], date=e["date"], home=t["home"]["team"]["displayName"], away=t["away"]["team"]["displayName"],
                        hg=int(t["home"].get("score") or 0), ag=int(t["away"].get("score") or 0),
                        state=st.get("state"), done=bool(st.get("completed")), name=st.get("name", "")))
    return out
