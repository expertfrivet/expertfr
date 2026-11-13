/* ExpertFR mobile — 💶 Chèques et bordereaux.
 *
 * Photo (outil 📄 document : redressée, contour coupé) → lecture par l'IA
 * (n°, date, montant, émetteur, client proposé) → l'expert vérifie, corrige
 * et valide → la photo part dans Drive › ExpertFR › Chèques et bordereaux ›
 * <année>, avec à côté un petit fichier .json qui reprend ce qui a été validé.
 * Le logiciel PC (Factures › 📷 Chèques et bordereaux) la trouve dans
 * « Photos à nommer », déjà remplie : il reste à cliquer « Ranger ».
 * Gardé dans le téléphone (IndexedDB « cheques ») tant que l'envoi n'est pas fait.
 * Utilise idb(), sousDossier(), envoyerFichier(), compterAttente() (dictee.js),
 * scannerDocument(), choisirDocument() (scanner.js), cleClaude() (micro.js).
 */
"use strict";

const RANGEMENT_CHEQUES = "Chèques et bordereaux";   // même dossier que le réglage du PC
const chequesTous = () => idb("cheques", "readonly", s => s.getAll());
const chequeMaj = x => idb("cheques", "readwrite", s => s.put(x));
const chequeSuppr = id => idb("cheques", "readwrite", s => s.delete(id));

let chq = null;            // saisie en cours : { type, blob, url, lecture, champs, doutes }
let typeChq = "CH";

const sansAccent = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const pad = n => String(n).padStart(2, "0");
const aujourdhui = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

// Fiches récentes, pour le menu « client »
function fichesRecentes() {
  return visibles().slice().reverse().filter(c => c.nom);
}
const libFiche = c => `${c.nom || ""} ${c.prenom || ""}`.trim() + (c.dossier ? ` · ${c.dossier}` : "");

// Client(s) proposé(s) d'après les noms lus sur le chèque
function proposerClients(noms) {
  const cibles = (noms || []).map(sansAccent).filter(Boolean);
  if (!cibles.length) return [];
  const trouves = [];
  for (const c of fichesRecentes()) {
    const n = sansAccent(c.nom);
    if (n.length >= 3 && cibles.some(t => t.split(/[^A-Z0-9]+/).includes(n) || t.includes(n)) && !trouves.some(x => x.nom === c.nom)) trouves.push(c);
  }
  return trouves.slice(0, 4).map(c => c.uid);
}

// ── Lecture par l'IA (Claude, même modèle que le Chat IA) ─────────────────
async function blobBase64(b) {
  const r = new FileReader();
  return new Promise(res => { r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(b); });
}
async function lireAvecIA(blob, type) {
  const petit = await reduire(blob, 1568, 0.85);
  const cle = await cleClaude();
  const consigne = type === "BOR"
    ? `Photo d'un BORDEREAU DE REMISE DE CHÈQUES (banque LCL le plus souvent). Lis : le n° du bordereau, la date, le montant total, et pour chaque chèque remis son n°, son montant et le nom du tireur.`
    : `Photo d'un CHÈQUE reçu en paiement par un cabinet d'expertise en bâtiment. Lis : le n° du chèque (ligne de chiffres en bas, 7 chiffres en général), la date, le montant en chiffres (vérifie avec le montant en lettres), et le nom de l'émetteur (titulaire du compte, imprimé sur le chèque).`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01",
               "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: MODELE_QUESTION, max_tokens: 800, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await blobBase64(petit) } },
      { type: "text", text: consigne + `
Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"type": "cheque" ou "bordereau", "numero": "…", "date": "JJ/MM/AAAA", "montant": "540,00", "emetteur": "…",
 "noms": ["NOM de famille ou société de chaque client, en majuscules"], "cheques": [{"numero": "…", "montant": "…", "nom": "…"}],
 "doutes": ["liste des champs lus avec un doute : numero, date, montant, emetteur, noms"], "remarque": "…"}
Mets "" pour ce que tu ne lis pas. N'invente jamais : en cas d'hésitation, donne ta meilleure lecture et ajoute le champ dans "doutes".` },
    ] }] }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) { cfg.claudeKey = ""; ecrire(LS.cfg, cfg); throw new Error("Clé Claude refusée : vérifiez-la dans ⚙️ Réglages"); }
    throw new Error("Lecture impossible (" + r.status + ")");
  }
  const t = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const m = t.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : {};
}

// ── Envoi dans Drive ──────────────────────────────────────────────────────
let envoiCheques = false;
async function envoyerCheques() {
  if (envoiCheques || !navigator.onLine || !cfg.folder || !jetonValide()) return;
  envoiCheques = true;
  let nb = 0;
  try {
    for (const x of (await chequesTous()).filter(c => c.etat === "attente" && c.blob)) {
      const racine = await sousDossier(cfg.folder, RANGEMENT_CHEQUES, true);
      const annee = String(new Date(x.ajout).getFullYear());
      const dos = await sousDossier(racine, annee, true);
      const t = new Date(x.ajout);
      // Nom « pas encore rangé » : le PC la met dans « Photos à nommer » et lit le .json d'à côté
      const base = `Telephone_${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}_${x.type}`;
      const id = await envoyerFichier(x.blob, "image/jpeg", base + ".jpg", dos, { expertfr: "paiement", type: x.type });
      const infos = { source: "téléphone", type: x.type === "BOR" ? "bordereau" : "cheque", numero: x.numero, date: x.date,
        montant: x.montant, emetteur: x.emetteur, noms: x.noms, dossiers: x.dossiers, cheques: x.cheques || [], valide_le: x.ajout };
      await envoyerFichier(new Blob([JSON.stringify(infos, null, 1)], { type: "application/json" }), "application/json",
                           base + ".json", dos, { expertfr: "paiement-infos" });
      delete x.blob;
      Object.assign(x, { etat: "envoye", driveId: id, fichier: base + ".jpg" });
      await chequeMaj(x);
      nb++;
    }
    if (nb) toast(`${nb} chèque(s) / bordereau(x) envoyé(s) dans Drive`);
  } catch (e) {
    if (e.message !== "reconnexion") toast(e.message);
  } finally {
    envoiCheques = false;
    await compterAttente();
    if (route().vue === "cheques" && !chq) rendreCheques();
  }
}

// ── Vue ───────────────────────────────────────────────────────────────────
async function nouvellePhotoCheque(capture) {
  const f = await choisirDocument(capture);
  if (!f) return;
  const b = await scannerDocument(f, typeChq === "BOR" ? "📑 Bordereau" : "🧾 Chèque");
  if (!b) return;
  chq = { type: typeChq, blob: b, url: URL.createObjectURL(b), lecture: null, enLecture: true, erreur: "",
          champs: { numero: "", date: aujourdhui(), montant: "", emetteur: "", cheques: "" }, doutes: [], clients: [] };
  rendreCheques();
  try {
    const l = await lireAvecIA(b, chq.type);
    if (!chq) return;
    chq.lecture = l;
    if (l.type === "bordereau" && chq.type === "CH") chq.type = "BOR";
    if (l.type === "cheque" && chq.type === "BOR") chq.type = "CH";
    Object.assign(chq.champs, {
      numero: l.numero || "", date: l.date || chq.champs.date, montant: l.montant || "", emetteur: l.emetteur || "",
      cheques: (l.cheques || []).map(c => [c.numero, c.montant && c.montant + " €", c.nom].filter(Boolean).join(" · ")).join("\n"),
    });
    chq.doutes = l.doutes || [];
    const noms = [...(l.noms || []), l.emetteur, ...(l.cheques || []).map(c => c.nom)];
    chq.clients = proposerClients(noms);
    if (!chq.clients.length && (l.noms || []).length) chq.doutes.push("client");
  } catch (e) {
    if (chq) chq.erreur = e.message;
  }
  if (chq) { chq.enLecture = false; if (route().vue === "cheques") rendreCheques(); }
}

function lireFormulaire() {
  const v = id => (document.getElementById(id) || {}).value || "";
  Object.assign(chq.champs, { numero: v("c-num").trim(), date: v("c-date").trim(), montant: v("c-mont").trim(),
                              emetteur: v("c-emet").trim(), cheques: v("c-liste") });
  chq.clients = [...document.querySelectorAll(".c-client")].map(s => s.value).filter(Boolean);
}

async function rendreCheques() {
  document.getElementById("title").textContent = "💶 Chèques et bordereaux";
  if (chq) return rendreSaisie();
  const tous = (await chequesTous()).sort((a, b) => b.ajout.localeCompare(a.ajout));
  if (route().vue !== "cheques" || chq) return;
  const att = tous.filter(x => x.etat === "attente"), env = tous.filter(x => x.etat === "envoye").slice(0, 8);
  const ligne = x => `<div class="cl"><div><div class="n">${x.type === "BOR" ? "📑 Bordereau" : "🧾 Chèque"} ${esc(x.numero)}</div>
    <div class="s">${esc((x.noms || []).join(" - "))} · ${esc(x.montant ? x.montant + " €" : "")} · ${esc(x.date)}</div></div>
    ${x.etat === "attente" ? `<button class="x" data-del="${esc(x.id)}" aria-label="Supprimer">🗑️</button>` : `<span class="badge">☁️</span>`}</div>`;
  $main.innerHTML = `
    <div class="tabs" style="margin-top:-12px">
      <button data-ty="CH" class="${typeChq === "CH" ? "on" : ""}">🧾 Chèque</button>
      <button data-ty="BOR" class="${typeChq === "BOR" ? "on" : ""}">📑 Bordereau</button>
    </div>
    <div class="card" style="text-align:center">
      <button class="gros-micro" id="c-photo" style="margin:0 auto;background:var(--compta);border-color:#FDE4C4;box-shadow:0 6px 18px rgba(146,64,14,.3);font-size:46px" aria-label="Photographier">📷</button>
      <div style="font-weight:700;color:var(--compta);margin:8px 0 4px">Photographier ${typeChq === "BOR" ? "le bordereau" : "le chèque"}</div>
      <p class="muted" style="margin:0 0 6px">Même un peu penché : l'appli le redresse et coupe le contour, puis l'IA le lit. Vous vérifiez avant l'envoi.</p>
      <button class="btn light" id="c-gal">🖼️ Choisir dans la galerie</button>
    </div>
    ${att.length ? `<b>⏳ En attente d'envoi</b>${att.map(ligne).join("")}` : ""}
    ${env.length ? `<b style="display:block;margin-top:10px">☁️ Envoyés au PC</b>${env.map(ligne).join("")}
      <p class="muted">Sur le PC : Factures › 📷 Chèques et bordereaux › « Photos à nommer », déjà remplies.</p>` : ""}`;
  $main.querySelectorAll("[data-ty]").forEach(b => b.onclick = () => { typeChq = b.dataset.ty; rendreCheques(); });
  document.getElementById("c-photo").onclick = () => nouvellePhotoCheque(true);
  document.getElementById("c-gal").onclick = () => nouvellePhotoCheque(false);
  $main.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Supprimer cette photo ? Elle n'a pas encore été envoyée.")) return;
    await chequeSuppr(b.dataset.del); await compterAttente(); rendreCheques();
  });
}

function rendreSaisie() {
  const bor = chq.type === "BOR";
  const doute = k => chq.doutes.includes(k);
  const champ = (id, k, lbl, type) => `<div class="${doute(k) ? "doute" : ""}"><label for="${id}">${lbl}${doute(k) ? " · ⚠ à vérifier" : ""}</label>
    <input id="${id}" ${type ? `inputmode="${type}"` : ""} value="${esc(chq.champs[k])}"></div>`;
  const fiches = fichesRecentes();
  const menu = (uid, i) => `<select class="c-client" data-i="${i}"><option value="">— choisir le client —</option>
    ${fiches.map(c => `<option value="${esc(c.uid)}"${c.uid === uid ? " selected" : ""}>${esc(libFiche(c))}</option>`).join("")}</select>`;
  const clients = chq.clients.length ? chq.clients : [""];
  $main.innerHTML = `
    <img src="${chq.url}" alt="Photo redressée" style="width:100%;border-radius:10px;border:1px solid var(--line);max-height:220px;object-fit:contain;background:#fff">
    ${chq.enLecture ? `<div class="card" style="text-align:center">⏳ L'IA lit ${bor ? "le bordereau" : "le chèque"}…</div>`
      : `<p class="muted" style="margin:8px 2px">${chq.erreur ? `⚠ ${esc(chq.erreur)} : remplissez à la main.` : "🤖 Lu par l'IA : vérifiez et corrigez si besoin."}</p>
    <div class="card">
      <div class="tabs" style="position:static;margin:0 0 6px;padding:0">
        <button data-ty="CH" class="${bor ? "" : "on"}">🧾 Chèque</button><button data-ty="BOR" class="${bor ? "on" : ""}">📑 Bordereau</button></div>
      <div class="row">${champ("c-num", "numero", bor ? "N° du bordereau" : "N° du chèque", "numeric")}${champ("c-date", "date", "Date")}</div>
      ${champ("c-mont", "montant", bor ? "Montant total (€)" : "Montant (€)", "decimal")}
      ${bor ? `<div class="${doute("cheques") ? "doute" : ""}"><label for="c-liste">Chèques remis (un par ligne)</label><textarea id="c-liste">${esc(chq.champs.cheques)}</textarea></div>`
            : champ("c-emet", "emetteur", "Émetteur lu sur le chèque")}
      <div class="${doute("client") || doute("noms") ? "doute" : ""}"><label>${bor ? "Client(s) concerné(s)" : "Client"}${chq.clients.length ? " · proposé par l'IA" : ""}${doute("client") ? " · ⚠ à choisir" : ""}</label>
        ${clients.map(menu).join("")}
        ${bor || clients.length > 1 ? `<button class="chip" id="c-plus" style="margin-top:6px">➕ Ajouter un client</button>` : ""}</div>
    </div>
    <button class="btn" id="c-ok" style="background:var(--client);border-color:var(--client)">✅ Valider et envoyer</button>`}
    <div class="row"><button class="btn light" id="c-refaire">📷 Reprendre</button><button class="btn danger" id="c-annul">✕ Annuler</button></div>`;
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  $main.querySelectorAll(".card [data-ty]").forEach(b => b.onclick = () => { lireFormulaire(); chq.type = b.dataset.ty; rendreSaisie(); });
  on("c-plus", () => { lireFormulaire(); chq.clients.push(""); if (!chq.clients[0]) chq.clients = ["", ""]; rendreSaisie(); });
  on("c-annul", () => { if (confirm("Abandonner cette photo ?")) { URL.revokeObjectURL(chq.url); chq = null; rendreCheques(); } });
  on("c-refaire", () => { URL.revokeObjectURL(chq.url); typeChq = chq.type; chq = null; nouvellePhotoCheque(true); });
  on("c-ok", async () => {
    lireFormulaire();
    const c = chq.champs;
    const fichesChoisies = chq.clients.map(parUid).filter(Boolean);
    if (!c.numero) return toast("Indiquez le n° " + (bor ? "du bordereau" : "du chèque"));
    if (!fichesChoisies.length) return toast("Choisissez le client");
    await chequeMaj({ id: newUid(), type: chq.type, blob: chq.blob, numero: c.numero.replace(/\s+/g, ""), date: c.date,
      montant: c.montant.replace(/\s*€/, ""), emetteur: c.emetteur,
      cheques: bor ? c.cheques.split("\n").map(s => s.trim()).filter(Boolean) : [],
      noms: [...new Set(fichesChoisies.map(f => (f.nom || "").toUpperCase()))], dossiers: fichesChoisies.map(f => f.dossier || ""),
      uids: fichesChoisies.map(f => f.uid), etat: "attente", ajout: new Date().toISOString() });
    URL.revokeObjectURL(chq.url); chq = null;
    toast("Enregistré : envoi au Drive");
    await compterAttente();
    rendreCheques();
    if (!jetonValide() && navigator.onLine) { try { await connecterGoogle(); } catch (e) { /* plus tard */ } }
    envoyerCheques();
  });
}

window.addEventListener("DOMContentLoaded", () => setTimeout(envoyerCheques, 2500));
