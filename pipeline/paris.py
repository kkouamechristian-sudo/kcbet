"""Probabilites de tous les paris simples, choix du pari le plus sur, et verification apres le match."""
import numpy as np
from scipy.stats import poisson


def matrix(lh, la, rho=0.0, n=10):
    g = np.arange(n + 1)
    M = np.outer(poisson.pmf(g, lh), poisson.pmf(g, la))
    if rho:
        M[0, 0] *= 1 - lh * la * rho
        M[0, 1] *= 1 + lh * rho
        M[1, 0] *= 1 + la * rho
        M[1, 1] *= 1 - rho
    return M / M.sum()


# code -> (libelle, condition sur le score final)
def codes(home, away):
    return {
        "1": (f"Victoire {home}", lambda h, a: h > a), "X": ("Match nul", lambda h, a: h == a), "2": (f"Victoire {away}", lambda h, a: a > h),
        "1X": (f"{home} ou nul", lambda h, a: h >= a), "X2": (f"Nul ou {away}", lambda h, a: a >= h), "12": (f"{home} ou {away}", lambda h, a: h != a),
        "O1.5": ("Plus de 1,5 but", lambda h, a: h + a > 1), "O2.5": ("Plus de 2,5 buts", lambda h, a: h + a > 2),
        "U2.5": ("Moins de 2,5 buts", lambda h, a: h + a < 3), "U3.5": ("Moins de 3,5 buts", lambda h, a: h + a < 4),
        "BTTS": ("Les deux équipes marquent", lambda h, a: h > 0 and a > 0), "NOBTTS": ("Pas les deux qui marquent", lambda h, a: not (h > 0 and a > 0)),
        "HS": (f"{home} marque", lambda h, a: h > 0), "AS": (f"{away} marque", lambda h, a: a > 0),
    }


def probs(lh, la, rho, home, away):
    M = matrix(lh, la, rho)
    n = M.shape[0]
    out = {}
    for c, (lab, fn) in codes(home, away).items():
        out[c] = (lab, float(sum(M[i, j] for i in range(n) for j in range(n) if fn(i, j))))
    return out


def sure(lh, la, rho, home, away, odds=None, ou=None, cap=.86):
    """Pari le plus probable parmi ceux qui restent un vrai pari (probabilite <= cap, soit une cote juste >= 1,16)."""
    P = probs(lh, la, rho, home, away)
    c, (lab, p) = max(((k, v) for k, v in P.items() if v[1] <= cap), key=lambda kv: kv[1][1])
    real = None
    if odds and c in ("1", "X", "2"):
        real = odds["1X2".index(c)]
    if ou and ou[0] and ou[1] and c in ("O2.5", "U2.5"):
        real = ou[0] if c == "O2.5" else ou[1]
    return dict(code=c, label=lab, p=p, odds=real)


def wins(code, hg, ag):
    return bool(codes("", "")[code][1](hg, ag))
