"""Liste des championnats de kcbet."""
import csv, json, os
from datetime import datetime

TOP5 = ("E0", "SP1", "D1", "I1", "F1")

# Fichiers saisonniers de football-data.co.uk : code -> (pays, nom)
MAIN = {
    "E0": ("Angleterre", "Premier League"), "E1": ("Angleterre", "Championship"), "E2": ("Angleterre", "League One"),
    "E3": ("Angleterre", "League Two"), "EC": ("Angleterre", "National League"),
    "SP1": ("Espagne", "LaLiga"), "SP2": ("Espagne", "LaLiga 2"),
    "D1": ("Allemagne", "Bundesliga"), "D2": ("Allemagne", "2. Bundesliga"),
    "I1": ("Italie", "Serie A"), "I2": ("Italie", "Serie B"),
    "F1": ("France", "Ligue 1"), "F2": ("France", "Ligue 2"),
    "SC0": ("Écosse", "Premiership"), "SC1": ("Écosse", "Championship"), "SC2": ("Écosse", "League One"), "SC3": ("Écosse", "League Two"),
    "N1": ("Pays-Bas", "Eredivisie"), "B1": ("Belgique", "Pro League"), "P1": ("Portugal", "Primeira Liga"),
    "T1": ("Turquie", "Süper Lig"), "G1": ("Grèce", "Super League"),
}

# Fichiers historiques /new/ de football-data.co.uk : code -> (pays source, ligue source, pays, nom)
NEW = {
    "ARG": ("Argentina", "Liga Profesional", "Argentine", "Liga Profesional"),
    "AUT": ("Austria", "Bundesliga", "Autriche", "Bundesliga"),
    "BRA": ("Brazil", "Serie A", "Brésil", "Série A"),
    "CHN": ("China", "Super League", "Chine", "Super League"),
    "DNK": ("Denmark", "Superliga", "Danemark", "Superliga"),
    "FIN": ("Finland", "Veikkausliiga", "Finlande", "Veikkausliiga"),
    "IRL": ("Ireland", "Premier Division", "Irlande", "Premier Division"),
    "JPN": ("Japan", "J1 League", "Japon", "J1 League"),
    "MEX": ("Mexico", "Liga MX", "Mexique", "Liga MX"),
    "NOR": ("Norway", "Eliteserien", "Norvège", "Eliteserien"),
    "POL": ("Poland", "Ekstraklasa", "Pologne", "Ekstraklasa"),
    "ROU": ("Romania", "Superliga", "Roumanie", "Superliga"),
    "SWE": ("Sweden", "Allsvenskan", "Suède", "Allsvenskan"),
    "SWZ": ("Switzerland", "Super League", "Suisse", "Super League"),
    "USA": ("USA", "MLS", "États-Unis", "MLS"),
}

# Calendriers openfootball/football.json : code -> (annee simple ?, fichier)
CALENDARS = {"E0": (False, "en.1"), "E1": (False, "en.2"), "D1": (False, "de.1"), "SP1": (False, "es.1"), "I1": (False, "it.1"),
             "F1": (False, "fr.1"), "N1": (False, "nl.1"), "P1": (False, "pt.1"), "BRA": (True, "br.1")}


def info(code):
    if code in MAIN:
        return MAIN[code]
    return NEW[code][2:]


def pdate(s):
    for f in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, f)
        except ValueError:
            pass
    return None


def rows_of(path):
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def history(data, code, seasons):
    """Matchs joues d'un championnat, du plus ancien au plus recent, au format commun."""
    out = []
    paths = [os.path.join(data, f"{s}_{code}.csv") for s in seasons] if code in MAIN else [os.path.join(data, f"NEW_{code}.csv")]
    for p in paths:
        if not os.path.exists(p):
            continue
        for r in rows_of(p):
            d = pdate(r.get("Date", ""))
            h, a = r.get("HomeTeam") or r.get("Home"), r.get("AwayTeam") or r.get("Away")
            g1, g2 = r.get("FTHG", r.get("HG")), r.get("FTAG", r.get("AG"))
            if d is None or not h or not a or g1 in ("", None) or g2 in ("", None):
                continue
            try:
                out.append(dict(d=d, home=h, away=a, hg=int(float(g1)), ag=int(float(g2)),
                                corners=sum(float(r.get(k) or 0) for k in ("HC", "AC")) if r.get("HC") not in ("", None) else None,
                                cards=sum(float(r.get(k) or 0) for k in ("HY", "AY", "HR", "AR")) if r.get("HY") not in ("", None) else None))
            except ValueError:
                continue
    out.sort(key=lambda m: m["d"])
    return out[-1000:]


def calendar_rows(data, code):
    p = os.path.join(data, f"CAL_{code}.json")
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf-8") as f:
        return json.load(f).get("matches", [])


def team_rates(rows, n=15):
    """Moyenne corners et cartons par equipe sur ses n derniers matchs."""
    c, k = {}, {}
    for m in rows:
        for t in (m["home"], m["away"]):
            if m["corners"] is not None:
                c.setdefault(t, []).append(m["corners"])
            if m["cards"] is not None:
                k.setdefault(t, []).append(m["cards"])
    return {t: sum(v[-n:]) / len(v[-n:]) for t, v in c.items()}, {t: sum(v[-n:]) / len(v[-n:]) for t, v in k.items()}
