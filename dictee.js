/* ExpertFR mobile — dictaphone.
 *
 * Enregistre la dictée d'un dossier (pause / reprise / stop), la garde dans
 * le téléphone (IndexedDB, morceau par morceau : rien n'est perdu si l'appli
 * se ferme en pleine dictée), puis l'envoie dans le dossier Google Drive dès
 * qu'il y a du réseau. Le PC la retrouve dans la page Rapport, la transcrit
 * et l'importe dans le texte du rapport.
 */
"use strict";

let _db = null;
function db() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open("expertfr", 3);
    req.onupgradeneeded = () => {
      const base = req.result, existe = n => base.objectStoreNames.contains(n);
      if (!existe("dictees")) base.createObjectStore("dictees", { keyPath: "id" });
      if (!existe("morceaux")) base.createObjectStore("morceaux", { keyPath: ["rec", "n"] });
      if (!existe("photos")) base.createObjectStore("photos", { keyPath: "id" });   // photos.js
      if (!existe("cheques")) base.createObjectStore("cheques", { keyPath: "id" }); // cheques.js
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _db;
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const res = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(res && "result" in res ? res.result : undefined);
    tx.onerror = () => reject(tx.error);
  });
}
const dicteesToutes = () => idb("dictees", "readonly", s => s.getAll());
const dicteeMaj = d => idb("dictees", "readwrite", s => s.put(d));
const dicteeSuppr = id => idb("dictees", "readwrite", s => s.delete(id));

async function morceauxDe(rec) {
  return idb("morceaux", "readonly", s => s.getAll(IDBKeyRange.bound([rec, 0], [rec, Infinity])));
}
async function morceauxSuppr(rec) {
  return idb("morceaux", "readwrite", s => s.delete(IDBKeyRange.bound([rec, 0], [rec, Infinity])));
}

// ── Enregistrement ────────────────────────────────────────────────────────
let rec = null;   // { mr, stream, d, n, cumul, depuis, ecritures, wake }

function typeAudio() {
  const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
  return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}
const extension = mime => mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
const dureeRec = () => rec ? rec.cumul + (rec.depuis ? (Date.now() - rec.depuis) / 1000 : 0) : 0;
const hms = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };

async function garderEcranAllume() {
  try { if (rec && "wakeLock" in navigator) rec.wake = await navigator.wakeLock.request("screen"); } catch (e) { /* pas grave */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && rec) garderEcranAllume(); });

async function demarrer(c) {
  if (!window.MediaRecorder || !navigator.mediaDevices) return toast("Ce navigateur ne permet pas d'enregistrer");
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    return toast("Micro refusé : autorisez le micro pour ce site dans les réglages du navigateur");
  }
  const mime = typeAudio();
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {});
  const d = { id: newUid(), uid: c.uid, dossier: refDossier(c), nom: `${c.nom || ""} ${c.prenom || ""}`.trim(),
              debut: new Date().toISOString(), duree: 0, mime: mr.mimeType || mime || "audio/webm", etat: "enregistrement" };
  await dicteeMaj(d);
  rec = { mr, stream, d, n: 0, cumul: 0, depuis: Date.now(), ecritures: Promise.resolve(), wake: null };
  mr.ondataavailable = e => {
    if (!e.data || !e.data.size) return;
    const morceau = { rec: d.id, n: rec.n++, blob: e.data };
    rec.ecritures = rec.ecritures.then(() => idb("morceaux", "readwrite", s => s.put(morceau)));
  };
  mr.start(5000);   // un morceau toutes les 5 s, écrit tout de suite dans le téléphone
  garderEcranAllume();
  majBarre();
}

function pause() {
  if (!rec) return;
  if (rec.mr.state === "recording") { rec.mr.pause(); rec.cumul = dureeRec(); rec.depuis = 0; }
  else if (rec.mr.state === "paused") { rec.mr.resume(); rec.depuis = Date.now(); }
  majBarre();
}

function arreter() {
  if (!rec) return Promise.resolve();
  const r = rec;
  return new Promise(resolve => {
    r.mr.onstop = async () => {
      await r.ecritures;
      r.d.duree = Math.round(dureeRec());
      r.stream.getTracks().forEach(t => t.stop());
      try { r.wake && r.wake.release(); } catch (e) { /* déjà libéré */ }
      rec = null;
      await finaliser(r.d);
      majBarre();
      toast("Dictée enregistrée dans le téléphone");
      resolve();
      if (window.envoyerDictees) envoyerDictees();
    };
    r.mr.stop();
  });
}

// Rassemble les morceaux en un seul fichier audio
async function finaliser(d) {
  const morceaux = (await morceauxDe(d.id)).sort((a, b) => a.n - b.n);
  if (!morceaux.length) { await dicteeSuppr(d.id); return; }
  d.blob = new Blob(morceaux.map(m => m.blob), { type: d.mime });
  d.taille = d.blob.size;
  if (!d.duree) d.duree = morceaux.length * 5;
  d.etat = "attente";
  await dicteeMaj(d);
  await morceauxSuppr(d.id);
  await compterAttente();
}

// Dictée interrompue (appli fermée, téléphone éteint) : on garde ce qui a été enregistré
async function recupererInterrompues() {
  for (const d of await dicteesToutes()) {
    if (d.etat === "enregistrement" && (!rec || rec.d.id !== d.id)) await finaliser(d);
  }
  await compterAttente();
}

function majBarre() {
  const b = document.getElementById("barre-rec");
  const nm = document.getElementById("nav-micro");
  if (nm) nm.classList.toggle("rec", !!rec);
  if (!rec) { b.hidden = true; clearInterval(majBarre._t); majBarre._t = null; rafraichirDictee(); return; }
  const enPause = rec.mr.state === "paused";
  b.hidden = false;
  b.textContent = `${enPause ? "⏸ En pause" : "● Enregistrement"} ${hms(dureeRec())} · ${rec.d.nom || rec.d.dossier}`;
  b.onclick = () => { location.hash = `#/fiche/${rec.d.uid}/dictee`; };
  if (!majBarre._t) majBarre._t = setInterval(majBarre, 1000);
  const t = document.querySelector(".rec .temps");
  if (t) t.textContent = hms(dureeRec());
}

// ── Envoi dans Google Drive ───────────────────────────────────────────────
let envoiEnCours = false;
window.nbDicteesAttente = 0;

async function compterAttente() {
  const photos = await idb("photos", "readonly", s => s.getAll());
  const cheques = await idb("cheques", "readonly", s => s.getAll());
  window.nbDicteesAttente = [...await dicteesToutes(), ...photos, ...cheques].filter(d => d.etat === "attente").length;
  if (typeof afficherSync === "function") afficherSync();
}

function nomFichier(d) {
  const t = new Date(d.debut);
  const p = n => String(n).padStart(2, "0");
  const date = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}_${p(t.getHours())}h${p(t.getMinutes())}-${p(t.getSeconds())}`;
  const nom = (d.nom || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
  return `Dictee_${d.dossier || "sans-numero"}_${nom}_${date}.${extension(d.mime)}`;
}

// Envoi d'un fichier dans Drive (envoi « resumable » : marche aussi pour les gros fichiers)
async function envoyerFichier(blob, type, nom, parent, properties) {
  const r = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": type, "X-Upload-Content-Length": String(blob.size) },
    body: JSON.stringify({ name: nom, parents: [parent], mimeType: type, properties }),
  });
  const lieu = r.headers.get("Location");
  if (!lieu) throw new Error("Drive n'a pas donné d'adresse d'envoi");
  const r2 = await fetch(lieu, { method: "PUT", headers: { "Content-Type": type }, body: blob });
  if (!r2.ok) throw new Error("Envoi vers Drive impossible (" + r2.status + ")");
  return (await r2.json()).id;
}

// Dossier Drive de l'expertise (« R202610001 - DUPONT Jean - Expertise 1 »), créé à la
// première photo ou dictée. Un ancien dossier sans « - Expertise N » compte comme l'expertise 1.
const numDossierDrive = nom => { const m = /- Expertise (\d+)\s*$/.exec(nom || ""); return m ? +m[1] : 1; };
const _dossiersEnCours = {};
const _dossiersVerifies = {};
// Dossiers rangés par année, comme sur le PC : « Dossiers expertises / 2026 / R2026… »
const RANGEMENT = "Dossiers expertises";
const anneeDossier = d => { const m = /^[A-Za-z]{0,2}(20\d\d)/.exec((d || "").trim()); return m ? m[1] : String(new Date().getFullYear()); };
const _rangement = {};
async function sousDossier(parent, nom, creer) {
  const cle = parent + "/" + nom;
  if (_rangement[cle]) return _rangement[cle];
  const base = "https://www.googleapis.com/drive/v3/files";
  const q = encodeURIComponent(`'${parent}' in parents and name='${nom}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const f = ((await (await api(`${base}?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json()).files || [])[0];
  let id = f && f.id;
  if (!id && creer) {
    // Même nom à la casse près (ex. « Chèques et Bordereaux » créé sur le PC) : on le réutilise
    const q2 = encodeURIComponent(`'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const tous = (await (await api(`${base}?q=${q2}&fields=files(id,name)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json()).files || [];
    const proche = tous.find(x => x.name.trim().toLowerCase() === nom.toLowerCase());
    id = proche && proche.id;
  }
  if (!id && creer) {
    id = (await (await api(`${base}?supportsAllDrives=true&fields=id`, {
      method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: nom, mimeType: "application/vnd.google-apps.folder", parents: [parent] }),
    })).json()).id;
  }
  if (id) _rangement[cle] = id;
  return id || "";
}
async function dossierAnnee(dossier, creer) {
  const r = await sousDossier(cfg.folder, RANGEMENT, creer);
  return r ? sousDossier(r, anneeDossier(dossier), creer) : "";
}
async function dossierClient(c) {
  if (c.drive_dossier) {
    // Dossier mémorisé : on vérifie une fois par session qu'il n'a pas été mis à la corbeille
    // (sinon les photos partent dans un dossier invisible depuis le PC).
    if (_dossiersVerifies[c.drive_dossier]) return c.drive_dossier;
    let vivant = false;
    try {
      const r = await api(`https://www.googleapis.com/drive/v3/files/${c.drive_dossier}?fields=trashed&supportsAllDrives=true`);
      vivant = !(await r.json()).trashed;
    } catch (e) { if (!/Drive 404/.test(e.message)) throw e; }
    if (vivant) { _dossiersVerifies[c.drive_dossier] = true; return c.drive_dossier; }
    const f = parUid(c.uid);
    if (f) { delete f.drive_dossier; enregistrer(f); }
    c = Object.assign({}, c); delete c.drive_dossier;
  }
  if (_dossiersEnCours[c.uid]) return _dossiersEnCours[c.uid];
  return (_dossiersEnCours[c.uid] = (async () => {
    const base = "https://www.googleapis.com/drive/v3/files";
    // Retrouvé par l'appli (propriété « fiche ») ou créé par le PC (nom « R202610001 - … »)
    const parNom = c.dossier ? ` or name contains '${c.dossier.replace(/'/g, "")} - '` : "";
    const idAnnee = await dossierAnnee(c.dossier, false);
    const ou = idAnnee ? `('${cfg.folder}' in parents or '${idAnnee}' in parents)` : `'${cfg.folder}' in parents`;
    const q = encodeURIComponent(`${ou} and mimeType='application/vnd.google-apps.folder' and trashed=false and (properties has { key='fiche' and value='${c.uid}' }${parNom})`);
    const trouve = (await (await api(`${base}?q=${q}&fields=files(id,name,properties)&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json()).files || [];
    const bon = trouve.find(f => (f.properties || {}).fiche === c.uid)
             || trouve.find(f => numDossierDrive(f.name) === numExp(c) && f.name.startsWith(`${c.dossier} - `));
    let id = bon && bon.id;
    if (!id) {
      const nom = `${c.dossier || "Sans numéro"} - ${c.nom || ""} ${c.prenom || ""}`.trim() + ` - Expertise ${numExp(c)}`;
      const parentAnnee = (await dossierAnnee(c.dossier, true)) || cfg.folder;
      id = (await (await api(`${base}?supportsAllDrives=true&fields=id`, {
        method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ name: nom, mimeType: "application/vnd.google-apps.folder", parents: [parentAnnee],
                               properties: { expertfr: "client", fiche: c.uid } }),
      })).json()).id;
    }
    const f = parUid(c.uid);
    if (f && !f.supprime) { f.drive_dossier = id; enregistrer(f); }
    return id;
  })().finally(() => { delete _dossiersEnCours[c.uid]; }));
}

async function envoyerDictees() {
  if (envoiEnCours || !navigator.onLine || !cfg.folder || !jetonValide()) return;
  envoiEnCours = true;
  try {
    for (const d of await dicteesToutes()) {
      if (d.etat !== "attente" || !d.blob) continue;
      const type = d.mime.split(";")[0];
      const fiche = parUid(d.uid);
      const parent = fiche && !fiche.supprime ? await dossierClient(fiche) : cfg.folder;
      const meta = { name: nomFichier(d) };
      const id = await envoyerFichier(d.blob, type, meta.name, parent,
                                      { expertfr: "dictee", fiche: d.uid, dossier: d.dossier });
      // Noté dans la fiche : le PC sait à quel dossier appartient la dictée
      const c = parUid(d.uid);
      if (c && !c.supprime) {
        c.dictees = [...(c.dictees || []).filter(x => x.id !== id),
                     { id, fichier: meta.name, date: d.debut, duree: d.duree }];
        enregistrer(c);
      }
      delete d.blob;                      // l'audio est dans le Drive : on libère le téléphone
      Object.assign(d, { etat: "envoye", driveId: id, fichier: meta.name });
      await dicteeMaj(d);
      toast("Dictée envoyée dans Google Drive");
    }
  } catch (e) {
    if (e.message !== "reconnexion") toast(e.message);
  } finally {
    envoiEnCours = false;
    await compterAttente();
    rafraichirDictee();
  }
  if (window.envoyerPhotos) envoyerPhotos();
  if (window.envoyerCheques) envoyerCheques();
}

// ── Onglet Dictée d'une fiche ─────────────────────────────────────────────
let ficheDictee = null;

function rafraichirDictee() {
  const r = route();
  if (r.vue === "fiche" && r.onglet === "dictee" && ficheDictee) {
    const $c = document.getElementById("contenu");
    if ($c) rendreDictee(ficheDictee, $c);
  }
}

async function rendreDictee(c, $c) {
  ficheDictee = c;
  const ici = rec && rec.d.uid === c.uid;
  const enPause = ici && rec.mr.state === "paused";
  let html = `<div class="card rec${ici && !enPause ? " on" : ""}">`;
  if (ici) {
    html += `<div class="etat">${enPause ? "⏸ EN PAUSE" : "● ENREGISTREMENT EN COURS"}</div>
      <div class="temps">${hms(dureeRec())}</div>
      <button class="gros-micro" id="d-stop" aria-label="Terminer la dictée"><span class="carre"></span></button>
      <div class="row"><button class="btn light" id="d-pause">${enPause ? "▶ Reprendre" : "⏸ Pause"}</button>
      <button class="btn" id="d-stop2">■ Terminer</button></div>
      <p class="muted" style="text-align:center;margin:0">Gardée au fur et à mesure dans le téléphone : rien n'est perdu si l'appli se ferme. L'écran reste allumé tout seul.</p>`;
  } else if (rec) {
    html += `<p>Une dictée est déjà en cours pour <b>${esc(rec.d.nom || rec.d.dossier)}</b>.</p>
      <button class="btn light" id="d-aller">Aller à cette dictée</button>`;
  } else {
    html += `<div class="etat">PRÊT À DICTER</div>
      <button class="gros-micro" id="d-start" aria-label="Démarrer la dictée">🎤</button>
      <div style="font-weight:700;color:var(--micro)">Touchez pour dicter</div>
      <p class="muted" style="text-align:center;margin:0">Pause et reprise possibles. Au stop, la dictée part dans Google Drive (tout de suite, ou dès que le réseau revient), puis le PC la transcrit dans la page Rapport.</p>`;
  }
  html += `</div>`;

  const locales = (await dicteesToutes()).filter(d => d.uid === c.uid && d.etat !== "enregistrement")
    .sort((a, b) => b.debut.localeCompare(a.debut));
  const idsLocaux = new Set(locales.map(d => d.driveId).filter(Boolean));
  const autres = (c.dictees || []).filter(x => !idsLocaux.has(x.id));   // envoyées depuis un autre appareil
  const date = s => new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  // Suivi de l'envoi : 📱 gardée dans le téléphone → ☁️ arrivée sur le Drive (le PC la prend là)
  const voyants = envoye => `<div class="voyants"><div class="vert">📱 Gardée dans le téléphone</div>
    ${envoye ? `<div class="vert">☁️ Sur le Drive, prête pour le PC</div>`
             : `<div class="orange">☁️ ${navigator.onLine ? "Envoi en cours…" : "Envoi dès le retour du réseau"}</div>`}</div>`;
  if (locales.length || autres.length) {
    html += `<div class="card"><b>Suivi de l'envoi au PC</b>
      ${locales.map(d => `<div class="dic"><div style="display:flex;justify-content:space-between"><b>${date(d.debut)}</b><span class="muted">${hms(d.duree || 0)}</span></div>
          ${voyants(d.etat === "envoye")}
          ${d.blob ? `<audio controls preload="none" data-a="${esc(d.id)}"></audio>` : ""}
          ${d.etat === "attente" ? `<button class="x" data-del="${esc(d.id)}" style="align-self:flex-start;background:none;border:0;color:var(--err);font:inherit;font-size:13px">🗑️ Supprimer</button>` : ""}
        </div>`).join("")}
      ${autres.map(x => `<div class="dic"><div style="display:flex;justify-content:space-between"><b>${date(x.date)}</b><span class="muted">${hms(x.duree || 0)}</span></div>
          ${voyants(true)}<span class="muted">Dictée faite depuis un autre appareil</span></div>`).join("")}
    </div>`;
  }
  // Rendu asynchrone : on n'écrase pas un autre onglet ouvert entre-temps
  if (route().onglet !== "dictee" || route().uid !== c.uid) return;
  $c.innerHTML = html;

  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on("d-start", async () => { await demarrer(c); rendreDictee(c, $c); });
  on("d-pause", () => { pause(); rendreDictee(c, $c); });
  on("d-stop", async () => { await arreter(); rendreDictee(c, $c); });
  on("d-stop2", async () => { await arreter(); rendreDictee(c, $c); });
  on("d-aller", () => { location.hash = `#/fiche/${rec.d.uid}/dictee`; });
  $c.querySelectorAll("audio[data-a]").forEach(a => {
    const d = locales.find(x => x.id === a.dataset.a);
    if (d && d.blob) a.src = URL.createObjectURL(d.blob);
  });
  $c.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Supprimer cette dictée ? Elle n'a pas encore été envoyée dans Drive.")) return;
    await dicteeSuppr(b.dataset.del);
    await compterAttente();
    rendreDictee(c, $c);
  });
}

// Prévenir avant de fermer l'appli en pleine dictée
window.addEventListener("beforeunload", e => { if (rec) { e.preventDefault(); e.returnValue = ""; } });

window.addEventListener("DOMContentLoaded", () => recupererInterrompues().then(() => envoyerDictees()));
