/* ExpertFR mobile — fiches clients, devis et checklist, hors ligne.
 *
 * Les fiches vivent dans le téléphone (localStorage) et se synchronisent
 * avec le PC via un fichier du dossier Google Drive : expertfr_clients.json.
 * Même règle que src/services/client_storage.py côté PC : chaque fiche a un
 * « uid » et une date de modification « maj » ; à la fusion, la plus récente
 * gagne ; une fiche supprimée reste en « pierre tombale » (supprime: true).
 */
"use strict";

const FICHIER = "expertfr_clients.json";
const SCOPE = "https://www.googleapis.com/auth/drive";
const LS = { clients: "efr_clients", dirty: "efr_dirty", cfg: "efr_cfg", token: "efr_token", last: "efr_last" };

// ── Stockage local ────────────────────────────────────────────────────────
function lire(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function ecrire(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

let clients = lire(LS.clients, []);
let dirty = new Set(lire(LS.dirty, []));
const cfg = lire(LS.cfg, { folder: "", clientId: "" });

function persister() { ecrire(LS.clients, clients); ecrire(LS.dirty, [...dirty]); }
function visibles() { return clients.filter(c => !c.supprime); }
function parUid(uid) { return clients.find(c => c.uid === uid); }

// Même format que le PC (microsecondes) pour que les dates se comparent bien
function nowIso() { return new Date().toISOString().replace("Z", "000Z"); }
function newUid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// Toujours plus récent que la version modifiée, même si l'horloge d'un des
// appareils avance : sinon la modification serait perdue à la fusion.
function majApres(prec) {
  const n = nowIso();
  if (!prec || n > prec) return n;
  const t = Date.parse(prec);
  return isNaN(t) ? n : new Date(t + 1).toISOString().replace("Z", "000Z");
}

function enregistrer(c) {
  const prec = parUid(c.uid);
  c.maj = majApres(prec && prec.maj > (c.maj || "") ? prec.maj : c.maj);
  const i = clients.findIndex(x => x.uid === c.uid);   // la synchro a pu remplacer l'objet entre-temps
  if (i < 0) clients.push(c); else clients[i] = c;
  dirty.add(c.uid);
  persister();
  afficherSync();
  planifierSync();
}

function supprimer(c) {
  const i = clients.findIndex(x => x.uid === c.uid);
  if (i < 0) return;
  clients[i] = { uid: c.uid, supprime: true, maj: majApres(clients[i].maj), nom: c.nom || "", dossier: c.dossier || "" };
  dirty.add(c.uid);
  persister();
  planifierSync();
}

function fusionner(local, distant) {
  const par = new Map(), ordre = [];
  for (const c of [...local, ...distant]) {
    if (!c || !c.uid) continue;
    if (!par.has(c.uid)) { ordre.push(c.uid); par.set(c.uid, c); }
    else if ((c.maj || "") > (par.get(c.uid).maj || "")) par.set(c.uid, c);
  }
  return ordre.map(u => par.get(u));
}

function prochainDossier() {
  const d = new Date();
  const prefix = "R" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0");
  let max = 0;
  for (const c of visibles()) {
    const n = c.dossier || "";
    if (n.startsWith(prefix) && n.length === prefix.length + 3) max = Math.max(max, parseInt(n.slice(prefix.length), 10) || 0);
  }
  return prefix + String(max + 1).padStart(3, "0");
}

// ── Google : connexion et synchro ─────────────────────────────────────────
let tokenClient = null, syncEnCours = false, timerSync = null;

function jetonValide() {
  const t = lire(LS.token, null);
  return t && t.exp > Date.now() + 60000 ? t.token : null;
}

function connecterGoogle() {
  return new Promise((resolve, reject) => {
    if (!cfg.clientId) return reject(new Error("Identifiant client Google manquant (Réglages)"));
    if (!window.google || !google.accounts) return reject(new Error("Pas de connexion à Google pour l'instant"));
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cfg.clientId,
      scope: SCOPE,
      callback: r => {
        if (r.error) return reject(new Error(r.error));
        ecrire(LS.token, { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 });
        resolve(r.access_token);
      },
      error_callback: e => reject(new Error(e.type === "popup_closed" ? "Connexion annulée" : (e.message || e.type))),
    });
    tokenClient.requestAccessToken({ prompt: lire(LS.token, null) ? "" : "consent" });
  });
}

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: "Bearer " + jetonValide() } });
  if (r.status === 401) { localStorage.removeItem(LS.token); throw new Error("reconnexion"); }
  if (!r.ok) throw new Error("Drive " + r.status + " " + (await r.text()).slice(0, 160));
  return r;
}

function planifierSync() {
  clearTimeout(timerSync);
  timerSync = setTimeout(() => synchroniser(false), 3000);
}

async function synchroniser(manuel) {
  if (syncEnCours) return;
  if (!navigator.onLine) return afficherSync();
  if (!cfg.folder || !cfg.clientId) { if (manuel) location.hash = "#/reglages"; return afficherSync(); }
  if (!jetonValide()) {
    if (!manuel) return afficherSync();           // la connexion Google demande un toucher
    try { await connecterGoogle(); } catch (e) { toast(e.message); return afficherSync(); }
  }
  syncEnCours = true; afficherSync();
  try {
    const q = encodeURIComponent(`'${cfg.folder}' in parents and name='${FICHIER}' and trashed=false`);
    const base = "https://www.googleapis.com/drive/v3/files";
    const liste = await (await api(`${base}?q=${q}&fields=files(id)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
    const id = liste.files && liste.files[0] ? liste.files[0].id : null;
    let distant = [];
    if (id) {
      const txt = (await (await api(`${base}/${id}?alt=media&supportsAllDrives=true`)).text()).trim();
      const d = txt ? JSON.parse(txt) : [];
      distant = Array.isArray(d) ? d : (d.clients || []);
    }
    const fusion = fusionner(clients, distant);
    const corps = JSON.stringify(fusion, null, 1);
    if (!id) {
      const meta = { name: FICHIER, parents: [cfg.folder], mimeType: "application/json" };
      const sep = "efr" + Date.now();
      const body = `--${sep}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${sep}\r\nContent-Type: application/json\r\n\r\n${corps}\r\n--${sep}--`;
      await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
        { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + sep }, body });
    } else if (corps !== JSON.stringify(distant, null, 1)) {
      await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&supportsAllDrives=true`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: corps });
    }
    // Les modifications faites pendant la synchro restent « à envoyer »
    const envoye = new Map(fusion.map(c => [c.uid, c.maj || ""]));
    clients = fusionner(clients, fusion);
    dirty = new Set(clients.filter(c => (c.maj || "") > (envoye.get(c.uid) ?? "")).map(c => c.uid));
    persister();
    ecrire(LS.last, { ok: true, heure: heure(), msg: `${visibles().length} fiche(s)` });
    if (dirty.size) planifierSync();
    rafraichirSiPossible();
  } catch (e) {
    const msg = e.message === "reconnexion" ? "Reconnexion Google nécessaire" : e.message;
    ecrire(LS.last, { ok: false, heure: heure(), msg });
    if (manuel) toast(msg);
  } finally {
    syncEnCours = false; afficherSync();
  }
}

function heure() { return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

function afficherSync() {
  const b = document.getElementById("sync");
  const last = lire(LS.last, null);
  const n = dirty.size;
  b.className = "";
  if (syncEnCours) b.textContent = "⏳ Synchro…";
  else if (!cfg.folder || !cfg.clientId) { b.textContent = "⚙️ Synchro à régler"; b.className = "err"; }
  else if (!navigator.onLine) { b.textContent = n ? `📴 ${n} modif. en attente` : "📴 Hors ligne"; if (n) b.className = "pending"; }
  else if (!jetonValide()) { b.textContent = n ? `🔑 ${n} modif. · toucher` : "🔑 Toucher pour synchro"; b.className = "pending"; }
  else if (n) { b.textContent = `⏳ ${n} modif. à envoyer`; b.className = "pending"; }
  else if (last && !last.ok) { b.textContent = "⚠️ Synchro"; b.className = "err"; }
  else b.textContent = last ? `☁️ ${last.heure}` : "☁️ Synchroniser";
}

// ── Affichage ─────────────────────────────────────────────────────────────
const $main = document.getElementById("main");
const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
let recherche = "", brouillon = null;
const chapitresOuverts = new Set();

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3000);
}

function route() {
  const p = location.hash.replace(/^#\/?/, "").split("/");
  return { vue: p[0] || "clients", uid: p[1], onglet: p[2] || "fiche" };
}

function rendre() {
  const r = route();
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.go === r.vue));
  document.getElementById("back").hidden = r.vue !== "fiche";
  if (r.vue === "fiche") rendreFiche(r);
  else if (r.vue === "nouveau") rendreNouveau();
  else if (r.vue === "reglages") rendreReglages();
  else rendreListe();
  afficherSync();
}

function rafraichirSiPossible() {
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;   // ne pas couper une saisie
  rendre();
}

function badge(statut) { return `<span class="badge">${esc(statut || "En attente")}</span>`; }

function rendreListe() {
  document.getElementById("title").textContent = "ExpertFR";
  const q = recherche.toLowerCase();
  const doublons = {};
  visibles().forEach(c => { if (c.dossier) doublons[c.dossier] = (doublons[c.dossier] || 0) + 1; });
  const liste = visibles().slice().reverse().filter(c =>
    `${c.nom || ""} ${c.prenom || ""} ${c.ville || ""} ${c.dossier || ""} ${c.societe || ""}`.toLowerCase().includes(q));
  $main.innerHTML = `
    <div class="search"><input id="q" type="search" placeholder="🔎 Rechercher (nom, ville, n°…)" value="${esc(recherche)}"></div>
    ${liste.length ? liste.map(c => `
      <div class="cl" data-uid="${esc(c.uid)}">
        <div><div class="n">${esc(c.nom)} ${esc(c.prenom)}</div>
        <div class="s">${esc(c.dossier || "sans n°")}${doublons[c.dossier] > 1 ? " ⚠ n° en double" : ""} · ${esc(c.ville_site || c.ville || "")}</div></div>
        ${badge(c.statut)}
      </div>`).join("") : `<div class="empty">${visibles().length ? "Aucun résultat" : "Aucune fiche pour l'instant.<br>Touchez ➕ Nouveau, ou synchronisez pour récupérer celles du PC."}</div>`}`;
  const inp = document.getElementById("q");
  inp.oninput = () => { recherche = inp.value; const pos = inp.selectionStart; rendreListe(); const n = document.getElementById("q"); n.focus(); n.setSelectionRange(pos, pos); };
  $main.querySelectorAll(".cl").forEach(el => el.onclick = () => { location.hash = `#/fiche/${el.dataset.uid}`; });
}

const CHAMPS = [
  ["dossier", "N° de dossier"], ["nom", "Nom"], ["prenom", "Prénom"], ["societe", "Société (si entreprise)"],
  ["tel", "Téléphone", "tel"], ["mail", "Email", "email"],
  ["adresse", "Adresse"], ["cp", "Code postal", "", true], ["ville", "Ville", "", true],
  ["adresse_site", "Adresse du site (si différente)"], ["cp_site", "CP site", "", true], ["ville_site", "Ville site", "", true],
];

function formFiche(c) {
  let html = "", demi = [];
  const champ = ([k, lbl, type]) => `<div><label>${lbl}</label><input data-k="${k}" type="${type || "text"}" value="${esc(c[k])}"${k === "nom" ? ' autocapitalize="characters"' : ""}></div>`;
  for (const f of CHAMPS) {
    if (f[3]) { demi.push(f); if (demi.length === 2) { html += `<div class="row">${demi.map(champ).join("")}</div>`; demi = []; } }
    else html += champ(f);
  }
  html += `<div><label>Objet de l'expertise</label><textarea data-k="objet">${esc(c.objet)}</textarea></div>
    <label>Statut du dossier</label><select data-k="statut">${DATA.STATUTS.map(s => `<option${s === (c.statut || "En attente") ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>`;
  return html;
}

function brancherForm(c, estNouveau) {
  $main.querySelectorAll("[data-k]").forEach(el => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      c[el.dataset.k] = el.dataset.k === "nom" ? el.value.toUpperCase() : el.value;
      if (!c.nom || !c.nom.trim()) return;                 // comme sur le PC : enregistré dès que le nom est saisi
      enregistrer(c);
      if (estNouveau) { brouillon = null; history.replaceState(null, "", `#/fiche/${c.uid}`); estNouveau = false; document.getElementById("back").hidden = false; }
    });
  });
}

function rendreNouveau() {
  document.getElementById("title").textContent = "Nouveau client";
  if (!brouillon) brouillon = { uid: newUid(), date: new Date().toLocaleDateString("fr-FR"), dossier: prochainDossier(), statut: "En attente" };
  $main.innerHTML = `<div class="card">${formFiche(brouillon)}<p class="muted">La fiche s'enregistre toute seule dès que le nom est saisi.</p></div>`;
  brancherForm(brouillon, true);
}

function rendreFiche(r) {
  const c = parUid(r.uid);
  if (!c || c.supprime) { location.hash = "#/clients"; return; }
  document.getElementById("title").textContent = `${c.nom || ""} ${c.prenom || ""}`;
  const onglets = [["fiche", "📋 Fiche"], ["devis", "💶 Devis"], ["checklist", "✅ Checklist"]];
  $main.innerHTML = `<div class="tabs">${onglets.map(([k, l]) => `<button data-t="${k}" class="${r.onglet === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="contenu"></div>`;
  $main.querySelectorAll(".tabs button").forEach(b => b.onclick = () => history.replaceState(null, "", `#/fiche/${c.uid}/${b.dataset.t}`) || rendre());
  const $c = document.getElementById("contenu");
  if (r.onglet === "devis") rendreDevis(c, $c);
  else if (r.onglet === "checklist") rendreChecklist(c, $c);
  else {
    const adr = [c.adresse_site || c.adresse, c.cp_site || c.cp, c.ville_site || c.ville].filter(Boolean).join(" ");
    $c.innerHTML = `
      <div class="row">
        ${c.tel ? `<a class="btn light" href="tel:${esc(c.tel.replace(/\s/g, ""))}">📞 Appeler</a>` : ""}
        ${adr ? `<a class="btn light" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adr)}">🗺️ Itinéraire</a>` : ""}
      </div>
      <div class="card">${formFiche(c)}</div>
      <button class="btn danger" id="del">🗑️ Supprimer la fiche</button>`;
    brancherForm(c, false);
    document.getElementById("del").onclick = () => {
      if (confirm(`Supprimer définitivement la fiche ${c.nom} ${c.prenom || ""} (ici et sur le PC) ?`)) { supprimer(c); location.hash = "#/clients"; }
    };
  }
}

// ── Devis (même barème que la page Devis du PC) ───────────────────────────
function calculerHT(d) {
  const v = Object.fromEntries(DATA.DEVIS.map(([k, , map]) => [k, map[d[k]] ?? Object.values(map)[0]]));
  return v.calc_taille * v.calc_type_client * v.calc_corps + v.calc_type_exp + v.calc_contra + v.calc_km + v.calc_interv;
}
const euros = n => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function rendreDevis(c, $c) {
  const d = c.devis || {};
  const ht = calculerHT(d);
  const coches = (d.calc_corps_liste || []).length;
  const labelsNb = Object.keys(DATA.DEVIS[2][2]);
  const nbChoisi = labelsNb.indexOf(d.calc_corps || labelsNb[0]) + 1;
  $c.innerHTML = `<div class="card">
    ${DATA.DEVIS.map(([k, lbl, map]) => `<label>${lbl}</label><select data-d="${k}">${Object.keys(map).map(o => `<option${o === d[k] ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`).join("")}
    ${coches && Math.min(coches, 5) !== nbChoisi ? `<div class="warn">⚠ ${coches} corps d'état cochés dans la checklist, mais « ${esc(d.calc_corps || labelsNb[0])} » choisi ici</div>` : ""}
    </div>
    <div class="card">
      <div class="total"><span>Montant HT</span><b>${euros(ht)}</b></div>
      <div class="total"><span>TVA 20 %</span><span>${euros(ht * 0.2)}</span></div>
      <div class="total big"><span>Total TTC</span><span>${euros(ht * 1.2)}</span></div>
      <p class="muted">${c.devis ? "Devis enregistré dans la fiche, retrouvé sur le PC." : "Choisissez les options : le devis s'enregistre dans la fiche."}</p>
    </div>`;
  $c.querySelectorAll("[data-d]").forEach(sel => sel.onchange = () => {
    const nd = { ...(c.devis || {}) };
    for (const [k, , map] of DATA.DEVIS) if (!nd[k]) nd[k] = Object.keys(map)[0];
    nd[sel.dataset.d] = sel.value;
    nd.calc_corps_liste = nd.calc_corps_liste || [];
    nd.montant_ht = calculerHT(nd);
    c.devis = nd;
    enregistrer(c);
    rendreDevis(c, $c);
  });
}

// ── Checklist (même bibliothèque et mêmes identifiants que le PC) ─────────
function construireChecklist(sel) {
  const corps = DATA.CORPS_ETAT.filter(c => (sel || []).includes(c));
  const docs = [...DATA.DOCUMENTS_COMMUNS], quest = [...DATA.QUESTIONS_COMMUNES];
  corps.forEach(c => { docs.push(...DATA.BIBLIOTHEQUE[c].documents); quest.push(...DATA.BIBLIOTHEQUE[c].questions); });
  return [
    { titre: "📞 Préparation du dossier", items: DATA.PREPARATION },
    { titre: "📄 Documents à demander au client", items: docs },
    { titre: "❓ Questions à poser au client", items: quest },
    ...corps.map(c => ({ titre: `🔍 Contrôles — ${c}`, items: DATA.BIBLIOTHEQUE[c].controles })),
    { titre: "📏 Relevés et photos", items: DATA.RELEVES },
    { titre: "✅ Clôture du dossier", items: DATA.CLOTURE },
  ];
}

function rendreChecklist(c, $c) {
  const corps = (c.devis && c.devis.calc_corps_liste || []).filter(x => DATA.CORPS_ETAT.includes(x));
  const etat = c.checklist || {};
  const chap = construireChecklist(corps);
  const compte = items => {
    const conc = items.filter(([id]) => etat[id] !== "na");
    return [conc.filter(([id]) => etat[id] === true).length, conc.length];
  };
  const [faits, total] = compte(chap.flatMap(ch => ch.items));
  const pct = total ? Math.round(100 * faits / total) : 0;
  $c.innerHTML = `
    <details class="corps"${corps.length && !chapitresOuverts.has("_corps") ? "" : " open"}>
      <summary><span>🏗️ Corps d'état : ${corps.length ? esc(corps.join(", ")) : "à cocher"}</span></summary>
      <div class="chips" style="padding:12px">${DATA.CORPS_ETAT.map(x => `<button class="chip${corps.includes(x) ? " on" : ""}" data-c="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <p class="muted" style="padding:0 12px 10px;margin:0">Les mêmes que dans le devis.</p>
    </details>
    <div class="card"><b>Progression : ${faits} / ${total} (${pct} %)</b><div class="bar"><i style="width:${pct}%"></i></div>
      <span class="muted">Touchez un point pour le cocher · ✕ = non concerné · ↺ pour le remettre</span></div>
    ${chap.map(ch => {
      const [f, t] = compte(ch.items);
      return `<details data-ch="${esc(ch.titre)}"${chapitresOuverts.has(ch.titre) ? " open" : ""}>
        <summary><span>${esc(ch.titre)}</span><span class="badge">${f}/${t}</span></summary>
        ${ch.items.map(([id, txt]) => {
          const s = etat[id];
          return `<div class="it${s === true ? " done" : s === "na" ? " na" : ""}" data-id="${esc(id)}">
            <div class="box">${s === true ? "✓" : ""}</div><div class="t">${esc(txt)}</div>
            <button class="x" data-na="${esc(id)}">${s === "na" ? "↺" : "✕"}</button></div>`;
        }).join("")}
      </details>`;
    }).join("")}`;
  const maj = fn => { c.checklist = { ...(c.checklist || {}) }; fn(c.checklist); enregistrer(c); const y = scrollY; rendreChecklist(c, $c); scrollTo(0, y); };
  $c.querySelectorAll("details[data-ch]").forEach(d => d.ontoggle = () => d.open ? chapitresOuverts.add(d.dataset.ch) : chapitresOuverts.delete(d.dataset.ch));
  const dc = $c.querySelector("details.corps");
  dc.ontoggle = () => dc.open ? chapitresOuverts.add("_corps") : chapitresOuverts.delete("_corps");
  $c.querySelectorAll(".it").forEach(el => el.onclick = e => {
    if (e.target.dataset.na) return;
    const id = el.dataset.id;
    if (etat[id] === "na") return;
    maj(ch => { if (ch[id] === true) delete ch[id]; else ch[id] = true; });
  });
  $c.querySelectorAll("[data-na]").forEach(b => b.onclick = () => {
    const id = b.dataset.na;
    maj(ch => { if (ch[id] === "na") delete ch[id]; else ch[id] = "na"; });
  });
  $c.querySelectorAll(".chip").forEach(b => b.onclick = () => {
    const x = b.dataset.c;
    const nouv = corps.includes(x) ? corps.filter(y => y !== x) : DATA.CORPS_ETAT.filter(y => y === x || corps.includes(y));
    c.devis = { ...(c.devis || {}), calc_corps_liste: nouv };
    enregistrer(c);
    rendreChecklist(c, $c);
  });
}

// ── Réglages ──────────────────────────────────────────────────────────────
function rendreReglages() {
  document.getElementById("title").textContent = "Réglages";
  const last = lire(LS.last, null);
  $main.innerHTML = `
    <div class="card">
      <b>Synchronisation avec le PC</b>
      <label>Dossier Google Drive (lien ou identifiant)</label>
      <input id="folder" value="${esc(cfg.folder)}" placeholder="https://drive.google.com/drive/folders/…">
      <label>Identifiant client Google (…apps.googleusercontent.com)</label>
      <input id="cid" value="${esc(cfg.clientId)}">
      <button class="btn" id="go">🔄 Se connecter et synchroniser</button>
      <p class="muted">${last ? `Dernière synchro ${last.heure} : ${esc(last.msg)}` : "Pas encore synchronisé."}
      ${dirty.size ? `<br>${dirty.size} modification(s) pas encore envoyée(s).` : ""}</p>
    </div>
    <div class="card">
      <b>Sauvegarde</b>
      <p class="muted">${visibles().length} fiche(s) dans ce téléphone. Les fiches sont aussi dans le Drive et sur le PC après chaque synchro.</p>
      <button class="btn light" id="export">💾 Télécharger une copie des fiches</button>
    </div>
    <div class="card"><b>Installer sur l'écran d'accueil</b>
      <p class="muted">Android (Chrome) : menu ⋮ → « Ajouter à l'écran d'accueil ».<br>iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».<br>L'appli marche ensuite sans réseau.</p></div>`;
  const sauver = () => {
    const f = document.getElementById("folder").value.trim();
    const m = f.match(/folders\/([\w-]+)/) || f.match(/[?&]id=([\w-]+)/);
    cfg.folder = m ? m[1] : f;
    cfg.clientId = document.getElementById("cid").value.trim();
    ecrire(LS.cfg, cfg);
    afficherSync();
  };
  document.getElementById("folder").onchange = sauver;
  document.getElementById("cid").onchange = sauver;
  document.getElementById("go").onclick = async () => { sauver(); await synchroniser(true); rendreReglages(); };
  document.getElementById("export").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(clients, null, 1)], { type: "application/json" }));
    a.download = `expertfr_fiches_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
}

// ── Démarrage ─────────────────────────────────────────────────────────────
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  if (b.dataset.go === "nouveau") brouillon = null;
  location.hash = "#/" + b.dataset.go;
});
document.getElementById("back").onclick = () => { location.hash = "#/clients"; };
document.getElementById("sync").onclick = () => synchroniser(true);
window.addEventListener("hashchange", () => { scrollTo(0, 0); rendre(); });
window.addEventListener("online", () => { afficherSync(); synchroniser(false); });
window.addEventListener("offline", afficherSync);
document.addEventListener("visibilitychange", () => { if (!document.hidden) synchroniser(false); });
setInterval(() => synchroniser(false), 120000);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
rendre();
synchroniser(false);
