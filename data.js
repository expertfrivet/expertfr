// Barème du devis et checklist : ils ne sont PAS publiés avec l'appli.
// Le téléphone les lit dans votre dossier Google Drive (expertfr_donnees.json)
// à chaque synchro, puis les garde pour travailler sans réseau.
const DONNEES_FICHIER = "expertfr_donnees.json";
const DONNEES_LS = "efr_donnees";
const DATA_VIDE = { CORPS_ETAT: [], PREPARATION: [], DOCUMENTS_COMMUNS: [], QUESTIONS_COMMUNES: [],
  RELEVES: [], CLOTURE: [], BIBLIOTHEQUE: {}, DEVIS: [] };
const STATUTS_DEFAUT = ["En attente", "OM envoyé", "Acompte payé", "Expertise réalisée", "Rapport envoyé",
  "Dossier payé", "Clôturé", "Annulé"];

function donneesValides(d) { return !!(d && Array.isArray(d.DEVIS) && d.DEVIS.length && Array.isArray(d.CORPS_ETAT)); }
function preparerDonnees(d) { return { ...DATA_VIDE, ...d, STATUTS: (d && d.STATUTS) || STATUTS_DEFAUT }; }

let DATA = (() => {
  try {
    const d = JSON.parse(localStorage.getItem(DONNEES_LS) || "null");
    if (donneesValides(d)) return preparerDonnees(d);
  } catch (e) { /* rien de gardé */ }
  return preparerDonnees(null);
})();
