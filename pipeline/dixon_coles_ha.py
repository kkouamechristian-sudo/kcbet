# -*- coding: utf-8 -*-
"""
================================================================================
    MODELE DIXON-COLES v2 (Home/Away separate)
================================================================================
    Amelioration ETAPE 1 : forces domicile/exterieur SEPAREES par equipe.

    RAPPEL DU MODELE CLASSIQUE (dixon_coles.py) :
        lambda = exp(attaque_i + defense_j + home_adv_global)
        mu     = exp(attaque_j + defense_i)
    -> Le meme home_adv pour toutes les equipes.

    NOUVEAU MODELE HA :
        lambda = exp(mu_H + attack_H[i] + defense_A[j])
        mu     = exp(mu_A + attack_A[j] + defense_H[i])
    -> Chaque equipe a 4 parametres au lieu de 2 :
       - attack_H : capacite offensive quand elle joue A DOMICILE
       - attack_A : capacite offensive quand elle joue A L'EXTERIEUR
       - defense_H : capacite defensive A DOMICILE
       - defense_A : capacite defensive A L'EXTERIEUR

    Ainsi, une equipe qui est un fort a domicile mais faible dehors (Marseille
    au Velodrome par ex.) est modelisee bien mieux que dans le modele classique.
================================================================================
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import poisson
from typing import Dict, Tuple, List


# ==============================================================================
def tau(x, y, lam, mu, rho):
    """Correction Dixon-Coles pour les scores faiblement correles."""
    if x == 0 and y == 0:
        return 1.0 - lam * mu * rho
    elif x == 0 and y == 1:
        return 1.0 + lam * rho
    elif x == 1 and y == 0:
        return 1.0 + mu * rho
    elif x == 1 and y == 1:
        return 1.0 - rho
    else:
        return 1.0


# ==============================================================================
def neg_log_likelihood_ha(params, home_idx, away_idx, hg, ag, weights, n):
    """Vraisemblance ponderee pour le modele Home/Away separate."""
    mu_H = params[0]
    mu_A = params[1]
    aH = params[2 : 2 + n].copy()
    aA = params[2 + n : 2 + 2 * n].copy()
    dH = params[2 + 2 * n : 2 + 3 * n].copy()
    dA = params[2 + 3 * n : 2 + 4 * n].copy()
    rho = params[-1]

    # Contraintes identifiantes (moyennes = 0)
    aH -= aH.mean()
    aA -= aA.mean()
    dH -= dH.mean()
    dA -= dA.mean()

    lam = np.exp(mu_H + aH[home_idx] + dA[away_idx])
    mu = np.exp(mu_A + aA[away_idx] + dH[home_idx])

    lam = np.clip(lam, 1e-8, 20.0)
    mu = np.clip(mu, 1e-8, 20.0)

    log_pois_h = poisson.logpmf(hg, lam)
    log_pois_a = poisson.logpmf(ag, mu)

    # Vectorisation de tau
    tau_vals = np.ones_like(lam)
    m00 = (hg == 0) & (ag == 0)
    m01 = (hg == 0) & (ag == 1)
    m10 = (hg == 1) & (ag == 0)
    m11 = (hg == 1) & (ag == 1)
    tau_vals[m00] = 1.0 - lam[m00] * mu[m00] * rho
    tau_vals[m01] = 1.0 + lam[m01] * rho
    tau_vals[m10] = 1.0 + mu[m10] * rho
    tau_vals[m11] = 1.0 - rho

    if np.any(tau_vals <= 0):
        return 1e10

    return -np.sum(weights * (np.log(tau_vals) + log_pois_h + log_pois_a))


# ==============================================================================
class DixonColesHA:
    """Modele Dixon-Coles avec forces Home/Away separees."""

    def __init__(self, xi: float = 0.0018):
        self.xi = xi
        self.teams: List[str] = []
        self.team_to_idx: Dict[str, int] = {}
        self.mu_H = 0.0
        self.mu_A = 0.0
        self.attack_H: Dict[str, float] = {}
        self.attack_A: Dict[str, float] = {}
        self.defense_H: Dict[str, float] = {}
        self.defense_A: Dict[str, float] = {}
        self.rho = 0.0
        self.fitted = False

    # --------------------------------------------------------------------------
    def fit(self, df: pd.DataFrame, verbose: bool = False) -> None:
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)

        self.teams = sorted(set(df['home_team']) | set(df['away_team']))
        self.team_to_idx = {t: i for i, t in enumerate(self.teams)}
        n = len(self.teams)

        home_idx = df['home_team'].map(self.team_to_idx).to_numpy()
        away_idx = df['away_team'].map(self.team_to_idx).to_numpy()
        hg = df['home_goals'].to_numpy(dtype=int)
        ag = df['away_goals'].to_numpy(dtype=int)

        t_max = df['date'].max()
        days_ago = (t_max - df['date']).dt.days.to_numpy()
        weights = np.exp(-self.xi * days_ago)

        # Initialisation : mu_H ~ log(1.5) (env 1.5 but/match a domicile)
        # mu_A ~ log(1.1) (env 1.1 but/match a l'exterieur)
        x0 = np.concatenate([
            [np.log(1.5)], [np.log(1.1)],
            np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n),
            [-0.05],
        ])

        bounds = [(-2, 2), (-2, 2)] + [(-3, 3)] * (4 * n) + [(-0.2, 0.2)]

        res = minimize(
            neg_log_likelihood_ha,
            x0=x0,
            args=(home_idx, away_idx, hg, ag, weights, n),
            method='L-BFGS-B',
            bounds=bounds,
            options={'maxiter': 1000},
        )

        # Recentrer et stocker
        aH = res.x[2 : 2 + n] - res.x[2 : 2 + n].mean()
        aA = res.x[2 + n : 2 + 2 * n] - res.x[2 + n : 2 + 2 * n].mean()
        dH = res.x[2 + 2 * n : 2 + 3 * n] - res.x[2 + 2 * n : 2 + 3 * n].mean()
        dA = res.x[2 + 3 * n : 2 + 4 * n] - res.x[2 + 3 * n : 2 + 4 * n].mean()

        self.mu_H = float(res.x[0])
        self.mu_A = float(res.x[1])
        self.attack_H = {t: float(aH[i]) for t, i in self.team_to_idx.items()}
        self.attack_A = {t: float(aA[i]) for t, i in self.team_to_idx.items()}
        self.defense_H = {t: float(dH[i]) for t, i in self.team_to_idx.items()}
        self.defense_A = {t: float(dA[i]) for t, i in self.team_to_idx.items()}
        self.rho = float(res.x[-1])
        self.fitted = True

        if verbose:
            print(f"  Modele HA ajuste : mu_H={self.mu_H:.3f}, mu_A={self.mu_A:.3f}, rho={self.rho:+.3f}")

    # --------------------------------------------------------------------------
    def _lambda_mu(self, home: str, away: str) -> Tuple[float, float]:
        if home not in self.team_to_idx or away not in self.team_to_idx:
            raise ValueError(f"Equipe inconnue : {home} ou {away}")
        lam = np.exp(self.mu_H + self.attack_H[home] + self.defense_A[away])
        mu = np.exp(self.mu_A + self.attack_A[away] + self.defense_H[home])
        return float(lam), float(mu)

    # --------------------------------------------------------------------------
    def score_matrix(self, home: str, away: str, max_goals: int = 10) -> np.ndarray:
        lam, mu = self._lambda_mu(home, away)
        M = np.zeros((max_goals + 1, max_goals + 1))
        for i in range(max_goals + 1):
            for j in range(max_goals + 1):
                M[i, j] = tau(i, j, lam, mu, self.rho) \
                          * poisson.pmf(i, lam) * poisson.pmf(j, mu)
        return M / M.sum()

    # --------------------------------------------------------------------------
    def predict(self, home: str, away: str, max_goals: int = 10) -> Dict:
        if not self.fitted:
            raise RuntimeError("Modele non ajuste.")

        M = self.score_matrix(home, away, max_goals)
        lam, mu = self._lambda_mu(home, away)

        p_home = np.tril(M, -1).sum()
        p_draw = np.trace(M)
        p_away = np.triu(M, 1).sum()

        p_1x = p_home + p_draw
        p_12 = p_home + p_away
        p_x2 = p_draw + p_away

        totals = np.add.outer(np.arange(max_goals + 1), np.arange(max_goals + 1))
        p_over_05 = M[totals >= 1].sum()
        p_over_15 = M[totals >= 2].sum()
        p_over_25 = M[totals >= 3].sum()
        p_over_35 = M[totals >= 4].sum()
        p_under_25 = 1 - p_over_25
        p_under_35 = 1 - p_over_35

        p_btts_yes = M[1:, 1:].sum()
        p_btts_no = 1 - p_btts_yes

        p_cs_home = M[:, 0].sum()
        p_cs_away = M[0, :].sum()

        flat = [(i, j, M[i, j])
                for i in range(max_goals + 1)
                for j in range(max_goals + 1)]
        top5 = sorted(flat, key=lambda z: -z[2])[:5]

        return {
            'lambda_home': lam,
            'mu_away': mu,
            'expected_goals': lam + mu,
            '1': p_home, 'X': p_draw, '2': p_away,
            '1X': p_1x, '12': p_12, 'X2': p_x2,
            'Over 0.5': p_over_05, 'Over 1.5': p_over_15,
            'Over 2.5': p_over_25, 'Over 3.5': p_over_35,
            'Under 2.5': p_under_25, 'Under 3.5': p_under_35,
            'BTTS Oui': p_btts_yes, 'BTTS Non': p_btts_no,
            'CS Domicile': p_cs_home, 'CS Exterieur': p_cs_away,
            'top_scores': top5,
        }

    # --------------------------------------------------------------------------
    def value_bet(self, probs: Dict, odds: Dict[str, float],
                  min_edge: float = 0.03, kelly_fraction: float = 0.25,
                  bankroll: float = 1.0) -> pd.DataFrame:
        rows = []
        for market, cote in odds.items():
            if market not in probs:
                continue
            p = probs[market]
            edge = p * cote - 1
            kelly_full = (p * cote - 1) / (cote - 1) if cote > 1 else 0
            kelly_used = max(0, kelly_fraction * kelly_full)
            rows.append({
                'Marché': market,
                'Cote': cote,
                'P (modèle)': p,
                'P implicite': 1 / cote,
                'Edge': edge,
                'Kelly frac': kelly_used,
                'Mise conseillée': kelly_used * bankroll,
            })
        df = pd.DataFrame(rows)
        return df[df['Edge'] >= min_edge].sort_values('Edge', ascending=False)

    # --------------------------------------------------------------------------
    def team_home_away_split(self, team: str) -> Dict[str, float]:
        """Affiche l'ecart de force domicile/exterieur d'une equipe.
        Utile pour visualiser l'effet du modele HA."""
        if team not in self.team_to_idx:
            raise ValueError(f"Equipe inconnue : {team}")
        return {
            'attack_home': self.attack_H[team],
            'attack_away': self.attack_A[team],
            'attack_diff': self.attack_H[team] - self.attack_A[team],
            'defense_home': self.defense_H[team],
            'defense_away': self.defense_A[team],
            'defense_diff': self.defense_H[team] - self.defense_A[team],
        }
