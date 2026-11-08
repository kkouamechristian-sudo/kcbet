/* Langue et theme. Le site est ecrit en francais ; en anglais, les textes affiches sont traduits a la volee. */
var LANG=(function(){try{return localStorage.getItem("kc-lang")||"fr"}catch(e){return"fr"}})();
var LOC=LANG==="en"?"en-GB":"fr-FR";
function T(fr,en){return LANG==="en"?en:fr}
document.documentElement.lang=LANG;

/* Phrases completes, puis morceaux de phrases. L'ordre compte : du plus long au plus court. */
var I18N_RULES=LANG!=="en"?[]:[
 [/^Réservé aux adultes\..*$/,"Adults only. Sports betting can lose you money and become addictive: only stake what you can afford to lose, and never chase losses. kcbet publishes probabilities and guarantees no winnings. Data: football-data.co.uk, openfootball, martj42. Live scores: ESPN, no guarantee."],
 [/^Le générateur choisit les paris les plus probables.*$/,"The generator picks the most likely bets among the ticked types, one per match and at most two per league, up to the target odds. It shows the real chance of winning."],
 [/^Chaque sélection ajoutée multiplie la cote.*$/,"Each added selection multiplies the odds, but also the bookmaker's margin. Replace the odds with your bookmaker's."],
 [/^Mise fixe à chaque pari\..*$/,"Fixed stake on every bet. The dot is the average result, the line the 90% range. A strategy is only proven if the whole line is right of zero."],
 [/^Chaque point compare la probabilité annoncée.*$/,"Each dot compares the announced probability with the observed frequency. On the diagonal the forecast is exact. Above it, the outcome happens more often than announced."],
 [/^Notez chaque pari avant le match\..*$/,"Log each bet before the match. Your log stays in this browser; nobody else sees it."],
 [/^Chaque pronostic est enregistré avant le coup d'envoi.*Suivi public depuis le (.+)\.$/,"Every prediction is recorded before kick-off, then compared with the final score, untouched. Scores arrive a few hours after the match. Public record since $1."],
 [/^Les paris les plus probables du jour, tous types confondus.*$/,"The day's most likely bets, all types combined. High probability means low odds: not necessarily a good bet."],
 [/^Pronostic recalculé avec le score.*$/,"Prediction recalculated with the score, the time left and known red cards. Method not tested on history."],
 [/^Prévision Dixon-Coles seule.*$/,"Dixon-Coles forecast only, without market odds, so less accurate. The date may change, and it does not count in our results."],
 [/^Sélections nationales : probabilités tirées du classement Elo \((.+) contre (.+)\), sans cote du marché\. Méthode testée sur (.+) matchs récents.*$/,"National teams: probabilities from the Elo rating ($1 vs $2), without market odds. Method tested on $3 recent matches, more accurate than chance, not compared with odds."],
 [/^Trop peu de matchs joués par une équipe.*$/,"Too few matches played by one team: fragile Dixon-Coles probabilities, no signal."],
 [/^Signal Dixon-Coles : (.+) à (.+), écart de (.+)\. Sur l'historique, cette règle a donné (.+) sur (.+) paris \(fourchette (.+) à (.+)\)\. Ce n'est pas prouvé\.$/,"Dixon-Coles signal: $1 at $2, edge $3. Historically this rule returned $4 over $5 bets (range $6 to $7). Not proven."],
 [/^Signal Dixon-Coles : (.+) à (.+), écart de (.+)\. Cette règle n'a pas été testée sur ce championnat\.$/,"Dixon-Coles signal: $1 at $2, edge $3. This rule has not been tested on this league."],
 [/^Gros favori : (.+) gagnés sur (.+) sur l'historique, soit (.+) de rendement \(fourchette (.+) à (.+)\)\. Ce n'est pas prouvé\.$/,"Heavy favourite: $1 won out of $2 historically, a $3 return (range $4 to $5). Not proven."],
 [/^Calculé (avec le classement Elo|avec Dixon-Coles|à partir des cotes du match)\. Colonnes : probabilité, puis juste prix\. Comparez avec la cote de votre bookmaker\.(.*)$/,(m,a,b)=>({"avec le classement Elo":"Computed with the Elo rating.","avec Dixon-Coles":"Computed with Dixon-Coles.","à partir des cotes du match":"Computed from the match odds."}[a])+" Columns: probability, then fair price. Compare with your bookmaker's odds."+(b?" Corners and cards: recent team averages, simple untested estimate.":"")],
 [/^(\d[\d\s ,.]*) matchs avec cotes et (\d[\d\s ,.]*) prévisions sur (\d+) championnats\. Cotes relevées le (.+)\. Touchez un match pour le détail\.$/,"$1 matches with odds and $2 forecasts across $3 leagues. Odds taken on $4. Tap a match for details."],
 [/^Aucun match à venir dans les données relevées le (.+)\.$/,"No upcoming match in the data taken on $1."],
 [/^(.+) matchs rejoués avec Dixon-Coles, sans information postérieure au coup d'envoi\. Son meilleur poids face au marché est de (.+) : les cotes moyennes restent la référence la plus précise\.$/,"$1 matches replayed with Dixon-Coles, with no information after kick-off. Its best weight against the market is $2: average odds remain the most accurate reference."],
 [/^(\d+) sélections sur (\d+) matchs différents, cote (.+), (.+) de chances que tout passe\.(.*)$/,(m,a,b,c,d,e)=>`${a} selections on ${b} different matches, odds ${c}, ${d} chance that everything wins.`+e.replace(/Seulement (\d+) sélections possibles pour cette cote\. ?/,"Only $1 selections possible for these odds. ").replace(/La cote dépasse nettement la cote visée.*?sélections\. ?/,"The odds are well above the target: these bet types are too long for that many selections. ").replace(/(\d+) cotes? estimées? à partir du juste prix : remplacez-(les par celles|la par celle) de votre bookmaker\./,"$1 odds estimated from the fair price: replace them with your bookmaker's.")],
 [/^Impossible d'atteindre cette cote avec ces critères\..*$/,"These odds cannot be reached with these criteria. Lower the target, add selections or widen the period."],
 [/^Entrez une cote visée entre.*$/,"Enter target odds between 1.05 and 100,000, for example 2.5."],
 [/^Cochez au moins un type de pari\.$/,"Tick at least one bet type."],
 [/^Exemple : les plus gros favoris de ces matchs.*$/,"Example: the heaviest favourites of these matches, at average odds. Add a selection from Matches to start your ticket."],
 [/^Ticket vide\..*$/,"Empty ticket. Open a match in Matches, then choose “Add to ticket”."],
 [/^Mis à jour à (.+)\. Actualisation automatique\.$/,"Updated at $1. Refreshes automatically."],
 [/^Scores en direct indisponibles pour le moment\..*$/,"Live scores unavailable right now. The page retries on its own."],
 [/^Chargement des scores…$/,"Loading scores…"],
 [/^Aucun match dans cette liste pour le moment\.$/,"No match in this list right now."],
 [/^Aucun match pour ce filtre\.$/,"No match for this filter."],
 [/^Aucun pari pour le moment\..*$/,"No bet yet. Add the first one with the form, or log a ticket from the Ticket tab."],
 [/^Aucun pronostic enregistré pour le moment\.$/,"No prediction recorded yet."],
 [/^(\d+) pronostics enregistrés pour des matchs à venir\.$/,"$1 predictions recorded for upcoming matches."],
 [/^Pronostics en attente de résultat\..*$/,"Predictions awaiting results. Results arrive in the days after the match."],
 [/^Ces matchs sont passés\..*$/,"These matches are over. New matches will appear as soon as the source publishes them."],
 [/^Pari le plus sûr : (.+), (.+), (cote|juste prix) (.+)\.$/,(m,a,b,c,d)=>`Safest bet: ${a}, ${b}, ${c==="cote"?"odds":"fair price"} ${d}.`],
 [/^Paris les plus sûrs réussis : (.+) sur (.+), pour (.+) annoncés$/,"Safest bets won: $1 out of $2, for $3 announced"],
 [/^Pronostics : (.+) gagnés sur (.+), (.+), cote moyenne (.+)$/,"Predictions: $1 won out of $2, $3, average odds $4"],
 [/^Gros favoris : (.+) gagnés sur (.+), (.+), cote moyenne (.+)$/,"Heavy favourites: $1 won out of $2, $3, average odds $4"],
 [/^Signaux Dixon-Coles : (.+) gagnés sur (.+), (.+), cote moyenne (.+)$/,"Dixon-Coles signals: $1 won out of $2, $3, average odds $4"],
 [/^(.+) paris · (.+) gagnés · cote moyenne (.+) · fourchette (.+) à (.+)$/,"$1 bets · $2 won · average odds $3 · range $4 to $5"],
 [/^Matchs testés, (.+) pour la saison (.+)$/,"Matches tested, $1 in the $2 season"],
 [/^Erreur du marché en (.+) \(plus bas = mieux\)$/,"Market error in $1 (lower is better)"],
 [/^Erreur de Dixon-Coles sur la même saison$/,"Dixon-Coles error over the same season"],
 [/^Chance que tout passe, soit (.+) tickets sur 100$/,"Chance that everything wins, i.e. $1 tickets out of 100"],
 [/^Résultat moyen estimé, soit (.+) pour cette mise$/,"Estimated average result, i.e. $1 for this stake"],
 [/^Rendement sur (.+) paris? réglés?$/,"Return over $1 settled bet(s)"],
 [/^Gain ou perte, pour (.+) misés$/,"Profit or loss, for $1 staked"],
 [/^(.+) : (.+) dépasse le juste prix de (.+) : (.+) estimé\.(.*)$/,(m,a,b,c,d,e)=>`${a}: ${b} beats the fair price of ${c}: ${d} estimated.`+(e.includes("grosses cotes")?" Careful: historically this kind of gap on long odds lost money.":e?" A positive gap is still an estimate, not proof.":"")],
 [/^(.+) : (.+) est sous le juste prix de (.+) : (.+) estimé\.$/,"$1: $2 is below the fair price of $3: $4 estimated."],
 [/^Coup d'envoi dans (.+)$/,"Kick-off in $1"],
 [/^Sur le passé, personne ne bat le marché ici$/,"On past data, nobody beats the market here"],
 [/^Tous nos pronostics, gagnés ou perdus$/,"All our predictions, won or lost"],
 [/^Votre combiné, sans maquillage$/,"Your accumulator, no make-up"],
 [/^Vos paris, comptés honnêtement$/,"Your bets, counted honestly"],
 [/^Les probabilités tiennent-elles parole \?$/,"Do the probabilities keep their word?"],
 [/^Pronostics de football, résultats publiés$/,"Football predictions, published results"],
 [/^Le deuxième avis vient de notre modèle Dixon-Coles.*$/,"The second opinion comes from our home/away Dixon-Coles model, refitted at every update. Its signals follow a fixed rule: 5 to 20% edge, at least 10 matches played per team."],
 [/^Les probabilités affichées viennent des cotes moyennes.*$/,"Displayed probabilities come from several bookmakers' average odds, with their margin removed proportionally. Long-range forecasts, without odds, come from Dixon-Coles alone and are not recorded in our results."],
 [/^Tous les types de paris sont calculés.*$/,"All bet types are computed from the expected goals implied by the match odds. Only the 1X2 result has been tested. Live predictions use the score, the time left and red cards. They are untested and not counted in our results."],
 [/^Les tests historiques ci-dessus portent.*$/,"The historical tests above cover the five big European leagues. The other leagues shown have not been tested."],
 [/^Sélections nationales \(Ligue des nations.*$/,"National teams (Nations League, AFCON qualifiers, friendlies): probabilities from an Elo rating built on martj42's international history, without odds. These matches do not count in our results."],
 [/^Les coupes d'Europe et les championnats africains.*$/,"European cups and African club competitions have no prediction: no free source provides both their odds and their history. Their scores are visible in Live."],
 [/^Le poids de Dixon-Coles est choisi sur.*$/,"The Dixon-Coles weight is chosen on the earlier seasons, before the test on the current one."],
 [/^Le test de Dixon-Coles a réajusté.*$/,"The Dixon-Coles test refitted the model every week on matches already played only, keeping the best bet per match. It dates from 6 November 2026 and is not rerun at every update."],
 [/^Le xG n'est disponible.*$/,"xG is only available for part of the matches."],
 [/^La saison .* reste un petit échantillon.*$/,"The current season is still a small sample, especially for heavy favourites. A good recent result can be luck."],
 [/^Dernier résultat intégré : (.+)\. Source : football-data\.co\.uk\..*$/,"Last result included: $1. Source: football-data.co.uk. Updated automatically several times a day."],
 [/^Prévision$/,"Forecast"],[/^Prév\.$/,"Fcst"],
 [/^Toujours parier le favori$/,"Always back the favourite"],[/^Gros favoris \(probabilité de 73 % ou plus\)$/,"Heavy favourites (73% or more)"],[/^Dixon-Coles, écart de 5 à 20 %, cotes Bet365$/,"Dixon-Coles, 5-20% edge, Bet365 odds"],[/^Dixon-Coles, même règle, mises Kelly\/4$/,"Dixon-Coles, same rule, Kelly/4 stakes"],[/^Dixon-Coles, écart de 5 à 20 %, cotes moyennes$/,"Dixon-Coles, 5-20% edge, average odds"],[/^Dixon-Coles, 1 X 2 seul$/,"Dixon-Coles, 1X2 only"],[/^Dixon-Coles, écart de 10 à 20 %$/,"Dixon-Coles, 10-20% edge"],[/^Meilleure cote, (\d) % au-dessus du juste prix$/,"Best odds, $1% above fair price"],
 [/^(\d+) sélections sur (\d+) matchs différents, cote (.+),$/,"$1 selections on $2 different matches, odds $3,"],
 [/^Seulement (\d+) sélections possibles pour cette cote\. (La cote dépasse nettement la cote visée.*?sélections\. )?(\d+) sélections sur (\d+) matchs différents, cote (.+),$/,(m,a,b,c,d,e)=>`Only ${a} selections possible for these odds. ${b?"The odds are well above the target: these bet types are too long for that many selections. ":""}${c} selections on ${d} different matches, odds ${e},`],
 [/^La cote dépasse nettement la cote visée.*?sélections\. (\d+) sélections sur (\d+) matchs différents, cote (.+),$/,"The odds are well above the target: these bet types are too long for that many selections. $1 selections on $2 different matches, odds $3,"],
 [/^de chances que tout passe\.(.*)$/,(m,e)=>"chance that everything wins."+e.replace(/(\d+) cotes? estimées? à partir du (?:juste prix|fair price) ?: remplacez-(?:les par celles|la par celle) de votre bookmaker\./,"$1 odds estimated from the fair price: replace them with your bookmaker's.")],
 [/^Pari le plus sûr :$/,"Safest bet:"],
 [/^, (.+), (cote|juste prix) (.+)\.$/,(m,a,b,c)=>`, ${a}, ${b==="cote"?"odds":"fair price"} ${c}.`],
 /* morceaux */
 [/Mi-temps \/ fin de match/g,"Half-time / full-time"],[/2e mi-temps/g,"2nd half"],[/Mi-temps/g,"Half-time"],
 [/Résultat et les deux marquent/g,"Result and both teams score"],[/Résultat et buts/g,"Result and goals"],[/Les deux équipes marquent/g,"Both teams to score"],[/Les deux marquent/g,"Both teams score"],
 [/Buts pair ou impair/g,"Odd or even goals"],[/Buts par équipe/g,"Team goals"],[/Total de buts/g,"Total goals"],[/Total exact/g,"Exact total"],[/Score exact/g,"Correct score"],[/Écart de buts/g,"Winning margin"],
 [/Remboursé si nul/g,"Draw no bet"],[/Double chance/g,"Double chance"],[/Prochain but/g,"Next goal"],[/Corners \(total\)/g,"Corners (total)"],[/Cartons \(total\)/g,"Cards (total)"],
 [/Buts attendus/g,"Expected goals"],[/Score le plus probable/g,"Most likely score"],[/Deuxième avis 1 X 2/g,"Second opinion 1X2"],[/moins précis que le marché/g,"less accurate than the market"],[/Plus de 2,5 buts \(marché\)/g,"Over 2.5 goals (market)"],
 [/Plus de (\d+),5 buts?/g,"Over $1.5 goals"],[/Moins de (\d+),5 buts?/g,"Under $1.5 goals"],[/Plus de (\d+),5/g,"Over $1.5"],[/Moins de (\d+),5/g,"Under $1.5"],[/ plus de (\d+),5/g," over $1.5"],
 [/(\d) buts ou plus/g,"$1+ goals"],[/(\d) buts?\b/g,"$1 goal(s)"],[/ par 3 buts ou plus/g," by 3+ goals"],[/ par (\d) buts?/g," by $1"],
 [/ et plus de 2,5/g," and over 2.5"],[/ et moins de 2,5/g," and under 2.5"],[/Nul et /g,"Draw and "],[/ et oui/g," and yes"],[/ sans encaisser/g," to nil"],[/ n'encaisse pas/g," clean sheet"],
 [/Pas les deux qui marquent/g,"Not both teams score"],[/Victoire /g,"Win "],[/ ou nul$/g," or draw"],[/^Nul ou /g,"Draw or "],[/ ou nul /g," or draw "],[/ marque$/g," to score"],[/^Match nul$/g,"Draw"],
 [/^Pair$/,"Even"],[/^Impair$/,"Odd"],[/^Oui$/,"Yes"],[/^Non$/,"No"],[/^Aucun$/,"None"],[/^Nul$/,"Draw"],
 [/Plus sûr :/g,"Safest:"],[/^Sûr : /g,"Safe: "],[/ · Sûr : /g," · Safe: "],[/Pronostic : /g,"Prediction: "],[/^Pronostic /g,"Prediction "],[/ · Pronostic /g," · Prediction "],[/ · Signal /g," · Signal "],
 [/ en direct$/g," live"],[/ avant match$/g," pre-match"],[/^juste /g,"fair "],[/ · juste prix /g," · fair price "],[/juste prix/g,"fair price"],[/ · cote estimée, à remplacer/g," · estimated odds, replace"],[/ · cote /g," · odds "],[/^cote /g,"odds "],
 [/^En direct (\d+)$/,"Live $1"],[/^À venir (\d+)$/,"Upcoming $1"],[/^Terminés (\d+)$/,"Finished $1"],[/^Direct \((\d+)\)$/,"Live ($1)"],
 [/ · (\d+) – (\d+) · Gagné$/,""],[/^Gagné$/,"Won"],[/^Perdu$/,"Lost"],[/· Gagné$/,"· Won"],[/· Perdu$/,"· Lost"],[/^À venir$/,"Upcoming"],[/^En attente$/,"Pending"],[/^Annulé$/,"Void"],[/^Reporté$/,"Postponed"],[/^Fin$/,"FT"],[/^MT$/,"HT"],
 [/Pas de pronostic/g,"No prediction"],[/Tous les championnats/g,"All leagues"],[/^Allemagne/,"Germany"],[/^Angleterre/,"England"],[/^Espagne/,"Spain"],[/^Italie/,"Italy"],[/^Écosse/,"Scotland"],[/^Pays-Bas/,"Netherlands"],[/^Belgique/,"Belgium"],[/^Turquie/,"Turkey"],[/^Grèce/,"Greece"],[/^Argentine/,"Argentina"],[/^Autriche/,"Austria"],[/^Brésil/,"Brazil"],[/^Chine/,"China"],[/^Danemark/,"Denmark"],[/^Finlande/,"Finland"],[/^Irlande/,"Ireland"],[/^Japon/,"Japan"],[/^Mexique/,"Mexico"],[/^Norvège/,"Norway"],[/^Pologne/,"Poland"],[/^Roumanie/,"Romania"],[/^Suède/,"Sweden"],[/^Suisse/,"Switzerland"],[/^États-Unis/,"United States"],[/^Sélections/,"National teams"],[/^Afrique/,"Africa"],
 [/Ligue des nations UEFA/g,"UEFA Nations League"],[/Ligue des nations CONCACAF/g,"CONCACAF Nations League"],[/Qualifications CAN/g,"AFCON qualifiers"],[/Matchs amicaux/g,"Friendlies"],[/Ligue des champions CAF/g,"CAF Champions League"],[/Coupe de la Confédération/g,"Confederation Cup"],[/Ligue des champions/g,"Champions League"],[/Ligue Europa/g,"Europa League"],[/Ligue Conférence/g,"Conference League"],
 [/^Aujourd'hui et demain$/,"Today and tomorrow"],[/^Aujourd'hui$/,"Today"],[/^Demain$/,"Tomorrow"],[/^3 jours$/,"3 days"],[/^7 jours$/,"7 days"],[/^Toutes$/,"All"],[/^Clubs seulement$/,"Clubs only"],[/^5 grands championnats$/,"Top 5 leagues"],
 [/^Matchs$/,"Matches"],[/^Direct$/,"Live"],[/^Résultats$/,"Results"],[/^Preuves$/,"Proof"],[/^Journal$/,"Log"],[/^Pronostics du jour$/,"Today's predictions"],[/^En direct$/,"Live"],[/^Compétitions$/,"Competitions"],
 [/^Tous$/,"All"],[/^Plus sûrs$/,"Safest"],[/^Gros favoris$/,"Heavy favourites"],[/^Signaux Dixon-Coles$/,"Dixon-Coles signals"],[/^Prévisions$/,"Forecasts"],[/^Les plus sûrs$/,"Safest"],[/^Favori$/,"Favourite"],
 [/^Issue$/,"Outcome"],[/^Proba$/,"Prob."],[/^Juste prix$/,"Fair price"],[/^Moyenne$/,"Average"],[/^Meilleure$/,"Best"],[/^Ma cote$/,"My odds"],[/^Au ticket$/,"Add to ticket"],[/^Retirer$/,"Remove"],[/^Tous les types de paris$/,"All bet types"],[/^Résultat$/,"Result"],
 [/^Générer un ticket$/,"Generate a ticket"],[/^Générer le ticket$/,"Generate ticket"],[/^Autre ticket$/,"Another ticket"],[/^Cote visée$/,"Target odds"],[/^Période$/,"Period"],[/^Nombre de sélections$/,"Number of selections"],[/^Compétitions$/,"Competitions"],[/^Types de paris$/,"Bet types"],[/^Tout cocher$/,"Tick all"],[/^Tout décocher$/,"Untick all"],
 [/^Mise du ticket \(FCFA\)$/,"Ticket stake (FCFA)"],[/^Noter dans le journal$/,"Log it"],[/^Cote totale$/,"Total odds"],[/^Chance nécessaire pour être à l'équilibre$/,"Chance needed to break even"],[/^Ticket noté dans le journal\.$/,"Ticket logged."],
 [/^Gain ou perte par stratégie$/,"Profit or loss by strategy"],[/^Depuis (\d+)$/,"Since $1"],[/^Saison (.+)$/,"Season $1"],[/^Voir le tableau$/,"Show table"],[/^Méthode et limites$/,"Method and limits"],[/^Tranche$/,"Range"],[/^Annoncé$/,"Announced"],[/^Observé$/,"Observed"],[/^Issues$/,"Outcomes"],[/^Probabilité annoncée \(%\)$/,"Announced probability (%)"],
 [/^Toujours parier le favori$/,"Always back the favourite"],[/^Gros favoris \(probabilité de 73 % ou plus\)$/,"Heavy favourites (73% or more)"],[/^Dixon-Coles, écart de 5 à 20 %, cotes Bet365$/,"Dixon-Coles, 5-20% edge, Bet365 odds"],[/^Dixon-Coles, même règle, mises Kelly\/4$/,"Dixon-Coles, same rule, Kelly/4 stakes"],[/^Dixon-Coles, écart de 5 à 20 %, cotes moyennes$/,"Dixon-Coles, 5-20% edge, average odds"],[/^Dixon-Coles, 1 X 2 seul$/,"Dixon-Coles, 1X2 only"],[/^Dixon-Coles, écart de 10 à 20 %$/,"Dixon-Coles, 10-20% edge"],[/^Meilleure cote, (\d) % au-dessus du juste prix$/,"Best odds, $1% above fair price"],
 [/^Nouveau pari$/,"New bet"],[/^Match ou ticket$/,"Match or ticket"],[/^Cote prise$/,"Odds taken"],[/^Mise \(FCFA\)$/,"Stake (FCFA)"],[/^Probabilité \(%\), si connue$/,"Probability (%), if known"],[/^Ajouter$/,"Add"],[/^Historique$/,"History"],[/^Supprimer$/,"Delete"],[/^Confirmer$/,"Confirm"],[/^En cours$/,"Open"],[/^Paris gagnés$/,"Bets won"],[/^Pari ajouté\.$/,"Bet added."],
 [/^Résultat attendu d'après les probabilités$/,"Expected result from the probabilities"],[/^Plus de 2,5 buts \(Dixon-Coles\)$/,"Over 2.5 goals (Dixon-Coles)"],
 [/^Match en vedette$/,"Featured match"],[/^Mon compte$/,"My account"],[/^Connexion$/,"Sign in"],[/^Publicité$/,"Advertising"],[/^Confidentialité$/,"Privacy"],[/^Annoncez sur kcbet$/,"Advertise on kcbet"],[/^Emplacements$/,"Placements"],[/^Contact$/,"Contact"],
 [/^Un compte gratuit garde votre journal.*$/,"A free account keeps your betting log online, so you can find it on all your devices. Adults only."],
 [/^Des parieurs consultent kcbet chaque jour.*$/,"Bettors visit kcbet every day for predictions, live scores and results. Put your brand in front of them."],
 [/^Tarifs à la semaine ou au mois.*$/,"Weekly or monthly rates, on request. Betting ads must follow your country's law and target adults only."],
 [/^Bannière du haut$/,"Top banner"],[/^Dans la liste des matchs$/,"In the match list"],[/^Colonne des compétitions$/,"Competitions column"],[/^Bas des pages$/,"Page bottom"],
 [/^: sous le match en vedette.*$/,": under the featured match, on the predictions page."],[/^: entre les championnats.*$/,": between leagues, on desktop and phone."],[/^: sur ordinateur, visible.*$/,": on desktop, visible while browsing."],[/^: Résultats, Preuves et Journal\.$/,": Results, Proof and Log."],
 [/^Sans compte$/,"Without an account"],[/^Avec un compte$/,"With an account"],[/^Jamais revendues$/,"Never sold"],[/^Effacement$/,"Erasing"],[/^Scores en direct$/,"Live scores"],
 [/^: kcbet n'enregistre rien sur vous.*$/,": kcbet records nothing about you. Your preferences, ticket and log stay in your browser."],
 [/^: nous enregistrons votre adresse e-mail.*$/,": we store your e-mail address, your encrypted password and your betting log with our account host Supabase. This data is only used to sign you in and restore your log."],
 [/^: vos données ne sont ni vendues.*$/,": your data is neither sold nor passed to advertisers."],
 [/^: vous pouvez effacer vos paris en ligne.*$/,": you can erase your online bets from My account. To delete the whole account, write to the contact on the Advertising page from your e-mail address."],
 [/^: si des publicités Google s'affichent.*$/,": if Google ads are shown, Google may use cookies to choose them."],
 [/^: votre navigateur les lit directement chez ESPN.*$/,": your browser reads them directly from ESPN, which therefore receives your IP address."],[/^Voir l'analyse →$/,"See analysis →"],
 [/ · juste /g," · fair "],[/^juste /g,"fair "],[/ marque( ·|$)/g," to score$1"],[/, cote /g,", odds "],[/Résultat : /g,"Result: "],[/ : /g,": "],[/ à (\d)/g," at $1"],
 [/ ou /g," or "],
 [/ gagnés sur /g," won out of "],[/ gagnés, /g," won, "],[/ paris$/g," bets"],[/ matchs$/g," matches"]
];
function trText(s){var t=s.trim();if(!t||!/[A-Za-zÀ-ÿ]/.test(t))return s;var o=t;
  for(var i=0;i<I18N_RULES.length;i++){var r=I18N_RULES[i];if(r[0].global||r[0].source[0]!=="^"){o=o.replace(r[0],r[1])}else if(r[0].test(o)){o=o.replace(r[0],r[1]);if(r[0].source.slice(-1)==="$")break}}
  return o===t?s:s.replace(t,o)}
function trNode(n){if(n.nodeType===3){var v=trText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;return}
  if(n.nodeType!==1||n.tagName==="SCRIPT"||n.tagName==="STYLE")return;
  if(n.hasAttribute&&n.hasAttribute("aria-label")){var a=trText(n.getAttribute("aria-label"));if(a!==n.getAttribute("aria-label"))n.setAttribute("aria-label",a)}
  for(var c=n.firstChild;c;c=c.nextSibling)trNode(c)}
if(LANG==="en"){
  var trObs=new MutationObserver(function(ms){trObs.disconnect();ms.forEach(function(m){if(m.type==="characterData")trNode(m.target);else m.addedNodes.forEach(trNode)});trObs.observe(document.body,{childList:true,subtree:true,characterData:true})});
  trNode(document.body);trObs.observe(document.body,{childList:true,subtree:true,characterData:true});
}

/* Boutons langue et theme */
(function(){
  var lb=document.getElementById("t-lang"),tb=document.getElementById("t-theme");
  if(lb){lb.textContent=LANG==="en"?"FR":"EN";lb.setAttribute("aria-label",LANG==="en"?"Passer en français":"Switch to English");
    lb.addEventListener("click",function(){try{localStorage.setItem("kc-lang",LANG==="en"?"fr":"en")}catch(e){}location.reload()})}
  function paint(){var light=document.documentElement.getAttribute("data-theme")==="light";if(tb){tb.setAttribute("aria-label",light?T("Passer en thème sombre","Switch to dark theme"):T("Passer en thème clair","Switch to light theme"));tb.innerHTML=light?'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5z"/></svg>':'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>'}
    var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",light?"#FFFFFF":"#121F2A")}
  if(tb)tb.addEventListener("click",function(){var light=document.documentElement.getAttribute("data-theme")!=="light";document.documentElement.setAttribute("data-theme",light?"light":"dark");try{localStorage.setItem("kc-theme",light?"light":"dark")}catch(e){}paint()});
  paint();
})();
