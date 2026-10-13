/* ExpertFR mobile — photos d'un dossier.
 *
 * Photo prise depuis l'appli ou choisie dans la galerie : réduite (2560 px,
 * largement assez pour un rapport), gardée dans le téléphone (IndexedDB) puis
 * envoyée dans le dossier Drive du client dès qu'il y a du réseau. Le PC les
 * ajoute au rapport (page Rapport, « Photos du téléphone »).
 * Utilise idb(), envoyerFichier(), dossierClient() et compterAttente() de dictee.js.
 */
"use strict";

const photosToutes = () => idb("photos", "readonly", s => s.getAll());
const photoMaj = p => idb("photos", "readwrite", s => s.put(p));
const photoSuppr = id => idb("photos", "readwrite", s => s.delete(id));

// Réduit une image (en respectant l'orientation de la photo) et la renvoie en JPEG
async function reduire(fichier, max, qualite) {
  let img;
  try { img = await createImageBitmap(fichier, { imageOrientation: "from-image" }); }
  catch (e) { img = await createImageBitmap(fichier); }
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  img.close && img.close();
  return new Promise(res => cv.toBlob(res, "image/jpeg", qualite));
}

async function ajouterPhotos(c, fichiers) {
  let n = 0;
  for (const f of fichiers) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const blob = await reduire(f, 2560, 0.85);
      const vignette = await reduire(f, 360, 0.7);
      await photoMaj({ id: newUid(), uid: c.uid, dossier: c.dossier || "", nom: `${c.nom || ""} ${c.prenom || ""}`.trim(),
                       date: new Date(f.lastModified || Date.now()).toISOString(), ajout: new Date().toISOString(),
                       blob, vignette, etat: "attente" });
      n++;
    } catch (e) {
      toast(`Photo illisible : ${f.name}`);
    }
  }
  if (n) toast(`${n} photo(s) ajoutée(s)`);
  await compterAttente();
  envoyerPhotos();
}

function nomPhoto(p, i) {
  const t = new Date(p.date), x = n => String(n).padStart(2, "0");
  const nom = (p.nom || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
  return `Photo_${p.dossier || "sans-numero"}_${nom}_${t.getFullYear()}-${x(t.getMonth() + 1)}-${x(t.getDate())}_${x(t.getHours())}h${x(t.getMinutes())}-${x(t.getSeconds())}_${p.id.slice(0, 4)}.jpg`;
}

let envoiPhotos = false;
async function envoyerPhotos() {
  if (envoiPhotos || !navigator.onLine || !cfg.folder || !jetonValide()) return;
  envoiPhotos = true;
  let nb = 0;
  try {
    const liste = (await photosToutes()).filter(p => p.etat === "attente" && p.blob).sort((a, b) => a.ajout.localeCompare(b.ajout));
    for (const p of liste) {
      const fiche = parUid(p.uid);
      const parent = fiche && !fiche.supprime ? await dossierClient(fiche) : cfg.folder;
      const nom = nomPhoto(p);
      const id = await envoyerFichier(p.blob, "image/jpeg", nom, parent, { expertfr: "photo", fiche: p.uid, dossier: p.dossier });
      delete p.blob;                      // la photo est dans le Drive : on garde seulement la vignette
      Object.assign(p, { etat: "envoye", driveId: id, fichier: nom });
      await photoMaj(p);
      nb++;
      await compterAttente();
      rafraichirPhotos();
    }
    if (nb) toast(`${nb} photo(s) envoyée(s) dans Google Drive`);
  } catch (e) {
    if (e.message !== "reconnexion") toast(e.message);
  } finally {
    envoiPhotos = false;
    await compterAttente();
    rafraichirPhotos();
  }
}

// ── Onglet Photos d'une fiche ─────────────────────────────────────────────
let fichePhotos = null;
const _urls = [];

function rafraichirPhotos() {
  const r = route();
  if (r.vue === "fiche" && r.onglet === "photos" && fichePhotos) {
    const $c = document.getElementById("contenu");
    if ($c) rendrePhotos(fichePhotos, $c);
  }
}

async function rendrePhotos(c, $c) {
  fichePhotos = c;
  const mes = (await photosToutes()).filter(p => p.uid === c.uid).sort((a, b) => b.ajout.localeCompare(a.ajout));
  if (route().onglet !== "photos" || route().uid !== c.uid) return;
  _urls.splice(0).forEach(u => URL.revokeObjectURL(u));
  const attente = mes.filter(p => p.etat === "attente").length;
  $c.innerHTML = `
    <div class="card">
      <div class="row">
        <label class="btn" style="margin:0">📷 Prendre une photo<input type="file" accept="image/*" capture="environment" hidden id="p-cam"></label>
        <label class="btn light" style="margin:0">🖼️ Galerie<input type="file" accept="image/*" multiple hidden id="p-gal"></label>
      </div>
      <p class="muted">${mes.length ? `${mes.length} photo(s) pour ce dossier${attente ? ` · ⏳ ${attente} en attente d'envoi` : " · ☁️ toutes dans Drive"}.` : "Les photos partent dans le dossier Drive du client, puis le PC les ajoute au rapport."}
</p>
    </div>
    ${mes.length ? `<div class="grille">${mes.map(p => `
      <div class="vig" data-id="${esc(p.id)}"><img alt="">
        <span class="badge">${p.etat === "envoye" ? "☁️" : "⏳"}</span>
        ${p.etat === "attente" ? `<button class="x" data-del="${esc(p.id)}">✕</button>` : ""}
      </div>`).join("")}</div>` : ""}`;
  $c.querySelectorAll(".vig").forEach(v => {
    const p = mes.find(x => x.id === v.dataset.id);
    const u = URL.createObjectURL(p.vignette || p.blob);
    _urls.push(u);
    v.querySelector("img").src = u;
  });
  const choisir = e => { const f = [...e.target.files]; e.target.value = ""; if (f.length) ajouterPhotos(c, f).then(() => rendrePhotos(c, $c)); };
  document.getElementById("p-cam").onchange = choisir;
  document.getElementById("p-gal").onchange = choisir;
  $c.querySelectorAll("[data-del]").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    if (!confirm("Retirer cette photo ? Elle n'a pas encore été envoyée dans Drive.")) return;
    await photoSuppr(b.dataset.del);
    await compterAttente();
    rendrePhotos(c, $c);
  });
}
