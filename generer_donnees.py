"""Régénère mobile/data.js (checklist + barème du devis) depuis le code du PC.
Depuis le dossier du logiciel :  python mobile/generer_donnees.py . > mobile/data.js
"""
import sys, json
sys.path.insert(0, sys.argv[1])
from src.services import checklist as ck
def items(key, lst): return [[i["id"], i["texte"]] for i in ck._items(key, lst)]
bib = {}
for c in ck.CORPS_ETAT:
    b = ck.BIBLIOTHEQUE[c]
    bib[c] = {"controles": items(f"ctrl_{ck._slug(c)}", b["controles"]),
              "documents": items("docs", b["documents"]),
              "questions": items("questions", b["questions"])}
data = {
 "CORPS_ETAT": ck.CORPS_ETAT,
 "PREPARATION": items("prep", ck.PREPARATION),
 "DOCUMENTS_COMMUNS": items("docs", ck.DOCUMENTS_COMMUNS),
 "QUESTIONS_COMMUNES": items("questions", ck.QUESTIONS_COMMUNES),
 "RELEVES": items("releves", ck.RELEVES),
 "CLOTURE": items("cloture", ck.CLOTURE),
 "BIBLIOTHEQUE": bib,
 "STATUTS": ["En attente", "OM envoyé", "Acompte payé", "Expertise réalisée", "Rapport envoyé", "Dossier payé", "Clôturé", "Annulé"],
 "DEVIS": [
  ["calc_type_client","Type de client",{"Particulier (×1.0)":1.0,"Copropriété (×1.5)":1.5,"Entreprise (×1.0)":1.0,"Mairie / Administration (×1.2)":1.2}],
  ["calc_taille","Taille du bâtiment",{"Maison < 100 m²":400,"Maison > 100 m²":500,"Appartement":400,"Multiples appartements":700,"Local commercial < 300 m²":700,"Local commercial > 300 m²":1000,"Entrepôt < 500 m²":700,"Entrepôt > 500 m²":1000}],
  ["calc_corps","Nombre de corps d'état",{"1 corps d'état (×1.0)":1.0,"2 corps d'état (×1.2)":1.2,"3 corps d'état (×1.3)":1.3,"4 corps d'état (×1.4)":1.4,"5 ou plus (×1.7)":1.7}],
  ["calc_type_exp","Type d'expertise",{"Note commentée (+40 €)":40,"Rapport d'expertise (+100 €)":100,"Rapport + suivi administratif (+150 €)":150,"Analyse pièces fournies (+250 €)":250}],
  ["calc_contra","Contradictoire",{"Non contradictoire (+0 €)":0,"Contradictoire (+100 €)":100,"Arbitrage (+200 €)":200,"Judiciaire (+250 €)":250}],
  ["calc_km","Frais kilométriques",{"Moins de 50 km (+20 €)":20,"50 à 100 km (+30 €)":30,"100 à 200 km (+60 €)":60,"Plus de 200 km (+90 €)":90}],
  ["calc_interv","Nombre d'interventions",{"1 intervention (+0 €)":0,"2 interventions (+320 €)":320,"3 interventions (+640 €)":640}],
 ],
}
print("// Généré depuis src/services/checklist.py et la page Devis d'app.py.\n// Ne pas modifier à la main : relancer mobile/generer_donnees.py.")
print("const DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";")
