/* ExpertFR mobile — liaison avec le site expert-batiment-rivet.com
 *
 * 📊 Stats    : chiffres du site et bilan du mois (fichier préparé par le PC
 *               dans le Drive : Site internet/expertfr_site_stats.json).
 * 📰 Articles : brouillons rédigés par le PC (expertfr_site_articles.json),
 *               à relire, corriger et publier sur le site d'un toucher.
 * 📥 Demandes : formulaires reçus sur le site (rangés par le script Google dans
 *               Drive › ExpertFR › Site internet › Demandes), affichés en haut
 *               de la liste des clients ; un toucher crée la fiche.
 * Publication des articles : dépôt GitHub du site (jeton dans les Réglages).
 * Utilise api(), cfg, lire/ecrire, esc, toast, enregistrer, newUid,
 * prochainDossier (app.js) et ajouterPhotos (photos.js).
 */
"use strict";

const SITE = { stats: "expertfr_site_stats.json", articles: "expertfr_site_articles.json" };
const LS_SITE = { stats: "efr_site_stats", articles: "efr_site_articles", demandes: "efr_site_demandes" };
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ORIGINES = ["Google (recherche)", "Site internet", "Fiche Google Maps", "Pages Jaunes", "Bouche à oreille", "Ancien client",
  "Avocat", "Notaire", "Agence immobilière", "Assurance / protection juridique", "Syndic", "Autre"];   // même liste que le PC

const moisLisible = m => { const [a, n] = (m || "").split("-"); return n ? `${MOIS_FR[+n - 1]} ${a}` : m; };
const moisDecale = (m, k) => { const [a, n] = m.split("-").map(Number); const t = a * 12 + n - 1 + k; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`; };
const siteUrl = () => (cfg.siteUrl || "https://www.expert-batiment-rivet.com").replace(/\/+$/, "");

// ── Drive : fichiers partagés avec le PC ─────────────────────────────────
const _idsDrive = {};
async function idDrive(nom) {
  if (_idsDrive[nom]) return _idsDrive[nom];
  const q = encodeURIComponent(`name='${nom.replace(/'/g, "")}' and trashed=false`);
  const r = await (await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
  return (_idsDrive[nom] = r.files && r.files[0] ? r.files[0].id : null);
}
async function lireJsonDrive(nom, defaut) {
  const id = await idDrive(nom);
  if (!id) return defaut;
  const t = (await (await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`)).text()).trim();
  return t ? JSON.parse(t) : defaut;
}
async function ecrireJsonDrive(nom, obj) {
  const id = await idDrive(nom);
  if (!id) throw new Error("Fichier introuvable dans Drive : " + nom);
  await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&supportsAllDrives=true`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj, null, 1) });
}
async function imageDrive(nom) {
  const id = await idDrive(nom);
  if (!id) return null;
  return (await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`)).blob();
}
const pretGoogle = () => navigator.onLine && cfg.folder && jetonValide();

// ── Site : demandes (Google Drive) et publication (GitHub) ───────────────
// Les formulaires du site sont rangés par un script Google dans
// ExpertFR/Site internet/Demandes ; les articles sont déposés dans le dépôt
// GitHub du site, qui fabrique la page tout seul en une à deux minutes.
const DRIVE = "https://www.googleapis.com/drive/v3/files";
async function dossierDrive(nom, parent) {
  const q = encodeURIComponent(`name='${nom}' and mimeType='application/vnd.google-apps.folder' and trashed=false` + (parent ? ` and '${parent}' in parents` : ""));
  const r = await (await api(`${DRIVE}?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
  return r.files && r.files[0] ? r.files[0].id : null;
}
let _dosDem = null;
async function dossiersDemandes() {
  if (_dosDem) return _dosDem;
  const site = await dossierDrive("Site internet");
  const dem = site && await dossierDrive("Demandes", site);
  if (!dem) return null;
  let tr = await dossierDrive("Traitées", dem);
  if (!tr) {
    tr = (await (await api(`${DRIVE}?supportsAllDrives=true`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Traitées", mimeType: "application/vnd.google-apps.folder", parents: [dem] }) })).json()).id;
  }
  return (_dosDem = { dem, tr });
}
async function listerDemandes() {
  const d = await dossiersDemandes();
  if (!d) return [];
  const q = encodeURIComponent(`'${d.dem}' in parents and name contains '.json' and trashed=false`);
  const r = await (await api(`${DRIVE}?q=${q}&fields=files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
  const liste = [];
  for (const f of r.files || []) {
    try {
      const x = JSON.parse(await (await api(`${DRIVE}/${f.id}?alt=media&supportsAllDrives=true`)).text());
      if (x && x.id) liste.push({ ...x, _fid: f.id });
    } catch (e) { /* fichier en cours d'écriture */ }
  }
  return liste.sort((a, b) => b.id.localeCompare(a.id));
}
async function photoDemande(d, n) {
  const b = await imageDrive((d.photos || [])[n].fichier);
  if (!b) throw new Error("Photo indisponible");
  return b;
}
async function demandeTraitee(d, statut) {
  const ds = await dossiersDemandes();
  if (!ds) throw new Error("Dossier des demandes introuvable dans Drive");
  const { _fid, ...propre } = d;
  const deplacer = id => api(`${DRIVE}/${id}?addParents=${ds.tr}&removeParents=${ds.dem}&supportsAllDrives=true`, { method: "PATCH",
    headers: { "Content-Type": "application/json" }, body: "{}" });
  await api(`https://www.googleapis.com/upload/drive/v3/files/${_fid}?uploadType=media&supportsAllDrives=true`, { method: "PATCH",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...propre, statut, traitee_le: new Date().toISOString().slice(0, 19) }, null, 1) });
  await deplacer(_fid);
  for (const p of d.photos || []) { const id = await idDrive(p.fichier); if (id) await deplacer(id); }
}

// GitHub (jeton limité au dépôt du site, saisi dans les Réglages)
const slugArticle = (mois, titre) => "article-" + mois + "-" + (titre || "").normalize("NFKD").replace(/[^\x00-\x7f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
async function github(methode, chemin, corps, ok404) {
  if (!cfg.githubDepot || !cfg.githubJeton) throw new Error("Dépôt ou jeton GitHub manquant (Réglages)");
  const r = await fetch(`https://api.github.com/repos/${cfg.githubDepot.replace(/^\/+|\/+$/g, "")}/contents/${chemin}`, {
    method: methode, body: corps ? JSON.stringify(corps) : undefined,
    headers: { Authorization: "Bearer " + cfg.githubJeton, Accept: "application/vnd.github+json" } });
  if (r.status === 404 && ok404) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("GitHub " + r.status + " : " + (d.message || "erreur"));
  return d;
}
async function deposerGithub(chemin, b64, message) {
  const ex = await github("GET", chemin, null, true);
  await github("PUT", chemin, { message, content: b64, ...(ex && ex.sha ? { sha: ex.sha } : {}) });
}
const b64Texte = t => { const o = new TextEncoder().encode(t); let s = ""; o.forEach(c => { s += String.fromCharCode(c); }); return btoa(s); };
const b64Blob = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(b); });
async function publierGithub(a, v) {
  const slug = slugArticle(a.mois, v.titre), photos = [];
  for (const [i, p] of v.photos.slice(0, 6).entries()) {
    const b = await imageDrive(p.fichier);
    if (!b) continue;
    const nom = `images/articles/${slug}-${i + 1}.jpg`;
    await deposerGithub("site/" + nom, await b64Blob(b), "Photo de l'article " + slug);
    photos.push({ fichier: nom, legende: p.legende || "" });
  }
  const donnees = { slug, mois: a.mois, titre: v.titre, resume: v.resume, commune: v.lieu, blocs: v.blocs, photos,
    publie_le: new Date().toISOString().slice(0, 16) };
  await deposerGithub(`donnees/articles/${slug}.json`, b64Texte(JSON.stringify(donnees, null, 1)), "Publication : " + v.titre);
  return { slug, adresse: `${siteUrl()}/${slug}` };
}

// ── Pastilles (articles en attente, demandes) et rafraîchissement ────────
function majPastilles() {
  const nA = (lire(LS_SITE.articles, []) || []).filter(a => a.statut === "attente").length;
  const b = document.querySelector('nav button[data-go="reglages"] .pastille');   // Articles est rangé dans les Réglages
  if (b) { b.textContent = nA; b.hidden = !nA; }
  const nD = (lire(LS_SITE.demandes, []) || []).length;   // demandes du site pas encore traitées
  const p = document.getElementById("pastille-demandes");
  if (p) { p.textContent = nD; p.hidden = !nD; }
}
let _majSite = false;
async function rafraichirSite() {
  if (_majSite || !navigator.onLine) return;
  _majSite = true;
  try {
    if (pretGoogle()) {
      const a = await lireJsonDrive(SITE.articles, { articles: [] }).catch(() => null);
      if (a) ecrire(LS_SITE.articles, a.articles || []);
      const s = await lireJsonDrive(SITE.stats, null).catch(() => null);
      if (s) ecrire(LS_SITE.stats, s);
    }
    if (pretGoogle()) {
      const d = await listerDemandes().catch(() => null);
      if (d) ecrire(LS_SITE.demandes, d);
    }
  } finally {
    _majSite = false;
    majPastilles();
    const v = route().vue;
    if (["stats", "articles", "clients"].includes(v)) rafraichirSiPossible();
  }
}

// Bandeau « nouvelles demandes du site » en haut de la liste des clients
function bandeauDemandes() {
  const d = lire(LS_SITE.demandes, []);
  if (!d.length) return "";
  return `<div class="card" style="border-color:var(--gold);background:#fffaf0">
    <b>📥 ${d.length} demande${d.length > 1 ? "s" : ""} reçue${d.length > 1 ? "s" : ""} sur le site</b>
    ${d.map(x => `<div class="cl" data-dem="${esc(x.id)}" style="margin:8px 0 0">
      <div><div class="n">${esc(x.nom || "Sans nom")}</div>
      <div class="s">${esc(x.type || "")} · ${esc(x.commune || "")} · ${esc((x.recue_le || "").slice(0, 10).split("-").reverse().join("/"))}</div></div>
      <span class="badge">${(x.photos || []).length ? "📷 " + x.photos.length : "Voir"}</span></div>`).join("")}</div>`;
}

// Réponse pré-remplie (e-mail ou SMS), relue et envoyée par l'expert lui-même
const sujetReponse = d => `Votre demande d'expertise${d.type ? " : " + d.type.toLowerCase() : ""}`;
function texteReponse(d, court) {
  const qui = d.nom ? `Bonjour ${d.nom},` : "Bonjour,";
  if (court) return `${qui} nous avons bien reçu votre demande sur notre site. Je vous rappelle rapidement pour en parler. Franck RIVET, expert en bâtiment.`;
  return `${qui}\n\nNous avons bien reçu votre demande${d.type ? ` concernant : ${d.type.toLowerCase()}` : ""}${d.commune ? `, à ${d.commune}` : ""}.\n\n`
    + `Je reviens vers vous très rapidement pour en parler et convenir d'une date de visite.\n\n`
    + `Bien cordialement,\n\nFranck RIVET\nExpertises Franck RIVET SARL\n${siteUrl().replace(/^https?:\/\//, "")}`;
}

// ── Vue : une demande du site ─────────────────────────────────────────────
async function rendreDemande(id) {
  const d = lire(LS_SITE.demandes, []).find(x => x.id === id);
  if (!d) { location.hash = "#/clients"; return; }
  document.getElementById("title").textContent = "Demande du site";
  const lignes = [["Téléphone", d.telephone], ["E-mail", d.email], ["Commune", [d.code_postal, d.commune].filter(Boolean).join(" ")],
    ["Problème", d.type], ["Urgence", d.urgence], ["Rappel", d.rappel], ["Depuis", d.depuis], ["Évolution", d.evolution], ["Assurance", d.assurance]]
    .filter(l => l[1]);
  $main.innerHTML = `
    <div class="card"><div class="n" style="font-size:18px;font-weight:600">${esc(d.nom || "Sans nom")}</div>
      ${lignes.map(([k, v]) => `<div class="total"><span class="muted">${k}</span><span>${esc(v)}</span></div>`).join("")}
      <p style="white-space:pre-wrap">${esc(d.message)}</p>
      ${d.telephone ? `<a class="btn light" href="tel:${esc(d.telephone.replace(/\s/g, ""))}">📞 Appeler</a>` : ""}
      <div class="row">
        ${d.email ? `<a class="btn light" href="mailto:${esc(d.email)}?subject=${encodeURIComponent(sujetReponse(d))}&body=${encodeURIComponent(texteReponse(d))}">✉️ E-mail</a>` : ""}
        ${d.telephone ? `<a class="btn light" href="sms:${esc(d.telephone.replace(/\s/g, ""))}?body=${encodeURIComponent(texteReponse(d, true))}">💬 SMS</a>` : ""}
      </div>
      ${d.email || d.telephone ? `<p class="muted" style="margin:6px 0 0">Le message est pré-rempli : vous le relisez et le complétez avant d'envoyer.</p>` : ""}</div>
    ${(d.photos || []).length ? `<div class="grille" id="dem-photos">${d.photos.map((p, i) => `<div class="vig" data-n="${i}"><img alt=""></div>`).join("")}</div>` : ""}
    <button class="btn" id="dem-ok">✅ Créer la fiche client</button>
    <button class="btn danger" id="dem-non">✕ Ne pas donner suite</button>`;
  const blobs = [];
  (d.photos || []).forEach((p, i) => photoDemande(d, i).then(b => {
    blobs[i] = b;
    const im = document.querySelector(`#dem-photos [data-n="${i}"] img`);
    if (im) im.src = URL.createObjectURL(b);
  }).catch(() => {}));
  document.getElementById("dem-ok").onclick = async e => {
    e.target.disabled = true; e.target.textContent = "⏳ Création de la fiche…";
    const mots = (d.nom || "").trim().split(/\s+/).filter(Boolean);
    const nom = mots.find(w => w.length > 1 && w === w.toUpperCase()) || mots[mots.length - 1] || "";
    const c = { uid: newUid(), date: new Date().toLocaleDateString("fr-FR"), dossier: prochainDossier(), statut: "En attente",
      nom: nom.toUpperCase(), prenom: mots.filter(w => w !== nom).join(" "), tel: d.telephone || "", mail: d.email || "",
      cp: d.code_postal || "", ville: d.commune || "", cp_site: d.code_postal || "", ville_site: d.commune || "",
      objet: `${d.type || ""} : ${d.message || ""}`.slice(0, 500), origine: "Site internet" };
    enregistrer(c);
    const fichiers = blobs.filter(Boolean).map((b, i) => new File([b], `site-${i + 1}.jpg`, { type: b.type || "image/jpeg" }));
    if (fichiers.length && window.ajouterPhotos) await ajouterPhotos(c, fichiers);
    try { await demandeTraitee(d, "acceptee"); } catch (e) { toast(e.message); }
    ecrire(LS_SITE.demandes, lire(LS_SITE.demandes, []).filter(x => x.id !== d.id));
    toast(`Fiche ${c.dossier} créée`);
    location.hash = `#/fiche/${c.uid}/fiche`;
  };
  document.getElementById("dem-non").onclick = async () => {
    if (!confirm("Ne pas donner suite à cette demande ? Elle disparaît de la liste (l'e-mail reste dans votre boîte).")) return;
    try { await demandeTraitee(d, "refusee"); } catch (e) { return toast(e.message); }
    ecrire(LS_SITE.demandes, lire(LS_SITE.demandes, []).filter(x => x.id !== d.id));
    location.hash = "#/clients";
  };
}

// ── Vue : statistiques ────────────────────────────────────────────────────
function markdownSimple(t) {
  return esc(t || "").split(/\n/).map(l =>
    l.startsWith("## ") ? `<h3 style="margin:14px 0 6px">${l.slice(3)}</h3>`
    : /^(\d+\.|-) /.test(l) ? `<div style="margin:4px 0 4px 10px">${l.replace(/^- /, "• ")}</div>`
    : l.trim() ? `<p style="margin:6px 0">${l}</p>` : "").join("").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}
let moisStats = "";
function rendreStats() {
  document.getElementById("title").textContent = "Statistiques du site";
  const s = lire(LS_SITE.stats, null);
  const mois = s ? Object.keys(s.mois || {}).sort().reverse() : [];
  if (!mois.length) {
    $main.innerHTML = `<div class="empty">Pas encore de chiffres.<br>Ils sont préparés par le logiciel du PC (page 🌐 Site),<br>puis arrivent ici à la synchro.</div>`;
    return;
  }
  if (!mois.includes(moisStats)) moisStats = mois[0];
  const d = s.mois[moisStats] || {}, p = s.mois[moisDecale(moisStats, -1)];
  const v = (o, ...ch) => ch.reduce((x, k) => (x && x[k]) || 0, o);
  const act = o => v(o, "analytics", "actions", "formulaire_envoye") + v(o, "analytics", "actions", "photos_envoyees");
  const tuile = (lbl, x, y) => {
    const delta = p ? x - y : null;
    return `<div class="card" style="margin:0;text-align:center"><div class="muted">${lbl}</div>
      <div style="font-size:26px;font-weight:700">${x}</div>
      ${delta === null ? "" : `<div style="font-size:13px;color:${delta > 0 ? "var(--ok)" : delta < 0 ? "var(--err)" : "var(--muted)"}">${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "= "}${delta} vs ${MOIS_FR[+moisDecale(moisStats, -1).slice(5) - 1]}</div>`}</div>`;
  };
  const rq = v(d, "google", "recherches") || [];
  const org = d.origines || [];
  const bilan = (s.bilans || {})[moisStats] || (s.bilans || {})[moisDecale(moisStats, -1)];
  $main.innerHTML = `
    <div class="chips" style="margin-bottom:10px">${mois.slice(0, 6).map(m => `<button class="chip${m === moisStats ? " on" : ""}" data-m="${m}">${moisLisible(m)}</button>`).join("")}</div>
    <div class="grille" style="grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      ${tuile("Visiteurs", v(d, "analytics", "visiteurs"), v(p, "analytics", "visiteurs"))}
      ${tuile("Clics depuis Google", v(d, "google", "clics"), v(p, "google", "clics"))}
      ${tuile("📞 Appels depuis le site", v(d, "analytics", "actions", "clic_appel"), v(p, "analytics", "actions", "clic_appel"))}
      ${tuile("✉️ Formulaires + photos", act(d), act(p))}
    </div>
    ${d.google ? `<p class="muted">Position moyenne sur Google : ${d.google.position || "—"} · ${d.google.apparitions || 0} apparitions</p>` : ""}
    ${bilan ? `<details open><summary><span>🤖 Bilan analysé</span></summary><div style="padding:4px 12px 10px">${markdownSimple(bilan)}</div></details>` : ""}
    <details${rq.length ? "" : " hidden"}><summary><span>🔎 Recherches Google</span><span>${rq.length}</span></summary>
      ${rq.map(r => `<div class="it"><div class="t">${esc(r.recherche)}</div><span class="muted">${r.clics} clic(s) · pos. ${r.position}</span></div>`).join("")}</details>
    <details><summary><span>👥 Origine des nouveaux clients</span><span>${org.reduce((n, o) => n + o.clients, 0)}</span></summary>
      ${org.length ? org.map(o => `<div class="it"><div class="t">${esc(o.origine)}</div><span class="muted">${o.clients} · ${Math.round(o.montant_ht)} € HT</span></div>`).join("")
        : `<div class="it"><div class="t muted">Aucune nouvelle fiche ce mois-ci</div></div>`}</details>
    <p class="muted">Mis à jour par le PC le ${esc((s.maj || "").replace("T", " à "))}.</p>`;
  $main.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { moisStats = b.dataset.m; rendreStats(); });
}

// ── Vue : articles ────────────────────────────────────────────────────────
const blocsVersTexte = bl => (bl || []).map(b => (b.type === "h2" ? "## " : b.type === "li" ? "- " : "") + (b.texte || "")).join("\n\n");
function texteVersBlocs(t) {
  const out = [];
  t.trim().split(/\n\s*\n/).forEach(par => {
    const lignes = par.trim().startsWith("- ") ? par.split("\n") : [par];
    lignes.forEach(l => {
      l = l.trim(); if (!l) return;
      if (l.startsWith("## ")) out.push({ type: "h2", texte: l.slice(3).trim() });
      else if (l.startsWith("- ")) out.push({ type: "li", texte: l.slice(2).trim() });
      else out.push({ type: "p", texte: l.replace(/\s+/g, " ") });
    });
  });
  return out;
}

function rendreArticles(id) {
  const arts = lire(LS_SITE.articles, []);
  if (id) return rendreArticle(arts.find(a => a.id === id));
  document.getElementById("title").textContent = "Articles du site";
  const att = arts.filter(a => a.statut === "attente");
  const pub = arts.filter(a => a.statut === "publie").sort((a, b) => b.mois.localeCompare(a.mois));
  $main.innerHTML = `
    <p class="muted">Rédigés chaque mois par le logiciel du PC à partir d'un dossier terminé, sans nom ni adresse. Rien n'est publié sans votre accord.</p>
    ${att.length ? `<b>À valider</b>${att.map(a => `<div class="cl" data-a="${esc(a.id)}"><div><div class="n">${esc(a.titre)}</div>
      <div class="s">${moisLisible(a.mois)} · ${esc(a.lieu || "")} · ${esc(a.theme || "")}</div></div><span class="badge" style="background:var(--gold);color:var(--navy)">À lire</span></div>`).join("")}`
      : `<div class="empty">Aucun article en attente.</div>`}
    ${pub.length ? `<b style="display:block;margin-top:14px">Publiés</b>${pub.map(a => `<a class="cl" style="text-decoration:none;color:inherit" target="_blank" rel="noopener" href="${esc(a.adresse || siteUrl())}">
      <div><div class="n">${esc(a.titre)}</div><div class="s">${moisLisible(a.mois)}</div></div><span class="badge">🌐</span></a>`).join("")}` : ""}`;
  $main.querySelectorAll("[data-a]").forEach(el => el.onclick = () => { location.hash = `#/articles/${el.dataset.a}`; });
}

function rendreArticle(a) {
  if (!a) { location.hash = "#/articles"; return; }
  document.getElementById("title").textContent = moisLisible(a.mois);
  const garder = new Set((a.photos || []).map(p => p.fichier));
  $main.innerHTML = `
    <div class="card">
      <label>Titre</label><input id="a-titre" value="${esc(a.titre)}">
      <label>Résumé (liste des articles et Google)</label><textarea id="a-resume">${esc(a.resume)}</textarea>
      <label>Lieu affiché (commune ou département seulement)</label><input id="a-lieu" value="${esc(a.lieu)}">
      <label>Texte · « ## » = intertitre, « - » = liste</label><textarea id="a-texte" style="min-height:340px">${esc(blocsVersTexte(a.blocs))}</textarea>
    </div>
    ${(a.photos || []).length ? `<p class="muted">Touchez une photo pour la retirer de l'article.</p>
      <div class="grille" id="a-photos">${a.photos.map(p => `<div class="vig" data-f="${esc(p.fichier)}"><img alt=""><span class="badge">✓ publiée</span></div>`).join("")}</div>` : ""}
    <p class="muted">Vérifiez : aucun nom, aucune adresse, aucune personne ni façade reconnaissable sur les photos.</p>
    <button class="btn" id="a-pub">🌐 Publier sur le site</button>
    <button class="btn light" id="a-sav">💾 Enregistrer sans publier</button>
    <button class="btn danger" id="a-ref">🗑️ Refuser cet article</button>`;
  (a.photos || []).forEach(p => imageDrive(p.fichier).then(b => {
    const im = document.querySelector(`#a-photos [data-f="${CSS.escape(p.fichier)}"] img`);
    if (b && im) im.src = URL.createObjectURL(b);
  }).catch(() => {}));
  $main.querySelectorAll("#a-photos .vig").forEach(v => v.onclick = () => {
    const f = v.dataset.f;
    garder.has(f) ? garder.delete(f) : garder.add(f);
    v.style.opacity = garder.has(f) ? 1 : .35;
    v.querySelector(".badge").textContent = garder.has(f) ? "✓ publiée" : "✕ retirée";
  });
  const valeurs = () => ({ titre: document.getElementById("a-titre").value.trim(), resume: document.getElementById("a-resume").value.trim(),
    lieu: document.getElementById("a-lieu").value.trim(), blocs: texteVersBlocs(document.getElementById("a-texte").value),
    photos: (a.photos || []).filter(p => garder.has(p.fichier)) });
  // Relit le fichier du Drive (le PC a pu le modifier) avant d'y écrire
  const sauver = async champs => {
    const d = await lireJsonDrive(SITE.articles, { articles: [] });
    const x = (d.articles || []).find(y => y.id === a.id);
    if (!x) throw new Error("Article introuvable dans Drive");
    Object.assign(x, champs);
    await ecrireJsonDrive(SITE.articles, d);
    ecrire(LS_SITE.articles, d.articles);
    majPastilles();
  };
  const exiger = () => { if (!pretGoogle()) { synchroniser(true); throw new Error("Connexion Google nécessaire : réessayez après la synchro"); } };
  document.getElementById("a-sav").onclick = async () => {
    try { exiger(); await sauver(valeurs()); toast("Enregistré (visible aussi sur le PC)"); } catch (e) { toast(e.message); }
  };
  document.getElementById("a-ref").onclick = async () => {
    if (!confirm("Refuser cet article ? Il ne sera pas publié.")) return;
    try { exiger(); await sauver({ statut: "refuse" }); location.hash = "#/articles"; } catch (e) { toast(e.message); }
  };
  document.getElementById("a-pub").onclick = async e => {
    const v = valeurs();
    if (!confirm(`Voulez-vous envoyer cet article sur le site internet ?\n\n« ${v.titre} »\n${v.photos.length} photo(s)`)) return;
    const btn = e.target; btn.disabled = true; btn.textContent = "⏳ Publication…";
    try {
      exiger();
      const r = await publierGithub(a, v);
      await sauver({ ...v, statut: "publie", adresse: r.adresse, slug: r.slug, publie_le: new Date().toISOString().slice(0, 16) });
      toast("✅ Article envoyé : en ligne d'ici 1 à 2 minutes");
      location.hash = "#/articles";
    } catch (err) {
      toast(err.message); btn.disabled = false; btn.textContent = "🌐 Publier sur le site";
    }
  };
}

// Champ « Comment nous a-t-il connus ? » dans la fiche (ajouté par formFiche)
function champOrigine(c) {
  const v = c.origine || "";
  return `<label>Comment nous a-t-il connus ?</label><select data-k="origine"><option value="">— à renseigner —</option>
    ${ORIGINES.concat(v && !ORIGINES.includes(v) ? [v] : []).map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
}

// Réglages : adresse et clé du site
function reglagesSite() {
  return `<div class="card"><b>Site internet</b>
    <label>Adresse du site</label><input id="site-url" value="${esc(cfg.siteUrl || "https://www.expert-batiment-rivet.com")}">
    <label>Dépôt GitHub du site</label><input id="site-depot" placeholder="expertfrivet/site-expert-batiment-rivet" value="${esc(cfg.githubDepot || "")}">
    <label>Jeton GitHub (accès au dépôt du site uniquement)</label><input id="site-jeton" type="password" value="${esc(cfg.githubJeton || "")}">
    <p class="muted">Sert à publier les articles. Les demandes du site arrivent par le Drive, sans réglage.</p></div>`;
}
function brancherReglagesSite() {
  const v = id => document.getElementById(id).value.trim();
  const s = () => { cfg.siteUrl = v("site-url"); cfg.githubDepot = v("site-depot"); cfg.githubJeton = v("site-jeton"); ecrire(LS.cfg, cfg); rafraichirSite(); };
  ["site-url", "site-depot", "site-jeton"].forEach(id => { document.getElementById(id).onchange = s; });
}

window.addEventListener("DOMContentLoaded", () => { majPastilles(); setTimeout(rafraichirSite, 1500); });
setInterval(rafraichirSite, 300000);
