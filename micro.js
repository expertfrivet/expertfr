/* ExpertFR mobile — le gros bouton 🎤 du bas.
 *
 * Ouvre un petit volet : dicter pour le dernier dossier ouvert (un toucher),
 * dicter pour un autre dossier (choisi dans la liste), ou poser une question
 * à l'IA (Claude) à voix haute.
 * Les questions à l'IA sont rangées dans le Drive, dossier « Conversations
 * autres », au même format que le Chat IA du PC (« Chat IA - téléphone … .json »)
 * : la recherche dans les anciennes conversations du PC les retrouve.
 * Utilise api(), cfg, lire/ecrire, esc, toast, parUid, route (app.js),
 * demarrer(), rec, sousDossier(), envoyerFichier() (dictee.js) et markdownSimple() (site.js).
 */
"use strict";

const MODELE_QUESTION = "claude-sonnet-5-5";   // même modèle que le Chat IA du PC
const LS_QUESTION = "efr_question";
const SYSTEME_QUESTION = `Tu es l'assistant de Franck RIVET, expert en bâtiment (cabinet Expertises Franck RIVET SARL, à Troyes), en France. Il te pose une question à voix haute depuis son téléphone, souvent sur le terrain : questions techniques (pathologies du bâtiment, DTU, normes, matériaux, mise en œuvre), de méthode d'expertise, de délais ou de démarches.

Règles :
- Réponds en français, court et pratique : la réponse d'abord en 2 ou 3 phrases, puis les détails utiles en quelques puces. Il lit sur un petit écran.
- La question a été dictée : corrige mentalement les mots mal reconnus.
- Sois précis et prudent sur les références : n'invente jamais un numéro de DTU, de norme ou d'article de loi. En cas de doute, dis « à vérifier ».
- Distingue ce qui est certain de ce qui est une hypothèse.
- Markdown simple (titres ##, listes, gras), sans tableaux.
- Vocabulaire du cabinet : il formule des **recommandations**, jamais des « préconisations ».
- S'il te manque une information indispensable, pose une seule question courte à la fin.`;

// ── Le volet du bouton 🎤 ────────────────────────────────────────────────
function fermerVolet() { document.getElementById("volet").hidden = true; }

function ouvrirVolet() {
  const v = document.getElementById("volet");
  const dernier = parUid(lire(LS.dernier, ""));
  const ok = dernier && !dernier.supprime;
  let haut;
  if (rec) {
    haut = `<button class="choix fort" id="v-encours"><span class="ic">●</span><span class="tx"><b>Revenir à la dictée en cours</b>
      <span>${esc(rec.d.nom || rec.d.dossier)}</span></span></button>`;
  } else if (ok) {
    haut = `<button class="choix fort" id="v-dernier"><span class="ic">🎤</span><span class="tx"><b>Dicter pour ${esc(`${dernier.nom || ""} ${dernier.prenom || ""}`.trim() || dernier.dossier)}</b>
      <span>${esc(dernier.dossier || "")} · le dernier dossier ouvert. La dictée part au PC comme d'habitude.</span></span></button>`;
  } else haut = "";
  v.innerHTML = `<div class="sheet" role="dialog" aria-label="Micro">
    <div class="poignee"></div>
    <h2>🎤 Que voulez-vous faire ?</h2>
    ${haut}
    <button class="choix cli" id="v-autre"><span class="ic">👥</span><span class="tx"><b>Dicter pour ${ok || rec ? "un autre" : "un"} dossier</b><span>Choisir le client dans la liste</span></span></button>
    <button class="choix ia" id="v-question"><span class="ic">💬</span><span class="tx"><b>Poser une question à l'IA</b><span>À voix haute, réponse écrite (un DTU, un délai, une démarche…)</span></span></button>
    <button class="annuler" id="v-annuler">Annuler</button></div>`;
  v.hidden = false;
  v.onclick = e => { if (e.target === v) fermerVolet(); };
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { fermerVolet(); fn(); }; };
  on("v-annuler", () => {});
  on("v-encours", () => { location.hash = `#/fiche/${rec.d.uid}/dictee`; });
  on("v-dernier", async () => {
    location.hash = `#/fiche/${dernier.uid}/dictee`;
    await demarrer(dernier);   // un seul toucher : la dictée démarre tout de suite
    rafraichirDictee();
  });
  on("v-autre", () => {
    modeChoix = true; recherche = "";
    if (route().vue === "clients") rendre(); else location.hash = "#/clients";
  });
  on("v-question", () => { location.hash = "#/question"; });
}

// ── Clé Claude : celle des Réglages, sinon celle du logiciel PC (config.ini du Drive) ──
async function cleClaude() {
  if (cfg.claudeKey) return cfg.claudeKey;
  if (!jetonValide()) await connecterGoogle();
  const q = encodeURIComponent(`name='config.ini' and trashed=false`);
  const base = "https://www.googleapis.com/drive/v3/files";
  const fs = (await (await api(`${base}?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json()).files || [];
  for (const f of fs) {
    const txt = await (await api(`${base}/${f.id}?alt=media&supportsAllDrives=true`)).text();
    let section = "";
    for (const l of txt.split(/\r?\n/)) {
      const s = /^\s*\[(.+)\]\s*$/.exec(l);
      if (s) { section = s[1].trim().toLowerCase(); continue; }
      const m = /^\s*api_key\s*[=:]\s*(\S+)/.exec(l);
      if (section === "claude" && m) { cfg.claudeKey = m[1]; ecrire(LS.cfg, cfg); return m[1]; }
    }
  }
  throw new Error("Clé Claude introuvable : collez-la dans ⚙️ Réglages");
}

// ── Conversation en cours (gardée dans le téléphone, copiée dans le Drive) ─
const dateFr = () => { const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
function conversation() {
  return lire(LS_QUESTION, null) || { debut: new Date().toISOString(), messages: [], driveId: "" };
}
function nomConversation(conv) {
  const t = new Date(conv.debut), p = n => String(n).padStart(2, "0");
  return `Chat IA - téléphone ${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}h${p(t.getMinutes())}.json`;
}

async function rangerConversation(conv) {
  const corps = JSON.stringify({ origine: "téléphone", modele: MODELE_QUESTION, messages: conv.messages,
    cout_total_usd: conv.messages.reduce((n, m) => n + (m.cout_usd || 0), 0) }, null, 1);
  const blob = new Blob([corps], { type: "application/json" });
  if (conv.driveId) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${conv.driveId}?uploadType=media&supportsAllDrives=true`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: blob });
  } else {
    const dos = await sousDossier(cfg.folder, "Conversations autres", true);
    conv.driveId = await envoyerFichier(blob, "application/json", nomConversation(conv), dos, { expertfr: "chat-telephone" });
  }
}

let questionEnCours = false, ecoute = null;

async function poser(texte) {
  texte = (texte || "").trim();
  if (!texte || questionEnCours) return;
  if (!navigator.onLine) return toast("Pas de réseau : la question partira quand vous aurez du réseau");
  const conv = conversation();
  conv.messages.push({ role: "user", texte, date: dateFr() });
  ecrire(LS_QUESTION, conv);
  questionEnCours = true; rendreQuestion();
  try {
    const cle = await cleClaude();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01",
                 "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: MODELE_QUESTION, max_tokens: 2000, system: SYSTEME_QUESTION,
        messages: conv.messages.map(m => ({ role: m.role, content: m.texte })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) { cfg.claudeKey = ""; ecrire(LS.cfg, cfg); throw new Error("Clé Claude refusée : vérifiez-la dans ⚙️ Réglages"); }
      throw new Error(r.status === 402 || /credit/i.test(JSON.stringify(j)) ? "Crédit Anthropic épuisé : rechargez sur console.anthropic.com"
        : "Claude ne répond pas (" + r.status + ")");
    }
    const rep = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    const u = j.usage || {};
    conv.messages.push({ role: "assistant", texte: rep || "(pas de réponse)", modele: MODELE_QUESTION, date: dateFr(),
      cout_usd: ((u.input_tokens || 0) * 2 + (u.output_tokens || 0) * 10) / 1e6 });
    ecrire(LS_QUESTION, conv);
    try { await rangerConversation(conv); ecrire(LS_QUESTION, conv); }
    catch (e) { toast("Réponse reçue, mais pas encore rangée dans le Drive"); }
  } catch (e) {
    conv.messages.pop();                       // la question reste dans la zone de saisie
    ecrire(LS_QUESTION, conv);
    brouillonQuestion = texte;
    toast(e.message);
  } finally {
    questionEnCours = false;
    if (route().vue === "question") rendreQuestion();
  }
}

// Dictée de la question (reconnaissance vocale du navigateur, gratuite)
function ecouter($zone, $btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("Dictée non disponible ici : tapez la question");
  if (ecoute) { ecoute.stop(); return; }
  const r = new SR();
  r.lang = "fr-FR"; r.interimResults = true; r.continuous = true;
  const avant = $zone.value ? $zone.value.trim() + " " : "";
  r.onresult = e => {
    let t = "";
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    $zone.value = avant + t;
    brouillonQuestion = $zone.value;
  };
  r.onend = () => { ecoute = null; $btn.classList.remove("on"); $btn.innerHTML = "🎤"; };
  r.onerror = e => { if (e.error === "not-allowed") toast("Micro refusé : autorisez-le dans les réglages du navigateur"); };
  ecoute = r;
  $btn.classList.add("on"); $btn.innerHTML = '<span class="carre"></span>';
  r.start();
}

let brouillonQuestion = "";

function rendreQuestion() {
  document.getElementById("title").textContent = "💬 Question à l'IA";
  const conv = conversation();
  $main.innerHTML = `
    ${conv.messages.length ? "" : `<p class="muted">Touchez le micro et posez votre question à voix haute. La réponse s'affiche ici, et la conversation est rangée dans le Drive (« Conversations autres ») : vous la retrouvez dans le Chat IA du PC.</p>`}
    <div id="fil">${conv.messages.map(m => m.role === "user"
      ? `<div class="bulle moi">${esc(m.texte)}</div>`
      : `<div class="bulle ia">${markdownSimple(m.texte)}</div>`).join("")}
      ${questionEnCours ? `<div class="bulle ia muted">⏳ Claude réfléchit…</div>` : ""}</div>
    <div class="card rec" style="margin-top:6px">
      <button class="gros-micro" id="q-micro" aria-label="Dicter la question" style="width:96px;height:96px;font-size:38px;border-width:6px">🎤</button>
      <label for="q-texte" style="align-self:flex-start;margin:0">Votre question (dictée ou tapée)</label>
      <textarea id="q-texte" placeholder="Ex. : délai de garantie décennale pour une fissure de façade ?">${esc(brouillonQuestion)}</textarea>
      <button class="btn" id="q-envoyer" style="background:var(--ia);border-color:var(--ia);width:100%"${questionEnCours ? " disabled" : ""}>${questionEnCours ? "⏳ Envoi…" : "Envoyer à l'IA"}</button>
      ${conv.messages.length ? `<button class="btn light" id="q-nouvelle" style="width:100%">➕ Nouvelle conversation</button>` : ""}
    </div>`;
  const $z = document.getElementById("q-texte"), $m = document.getElementById("q-micro");
  $z.oninput = () => { brouillonQuestion = $z.value; };
  $m.onclick = () => ecouter($z, $m);
  document.getElementById("q-envoyer").onclick = () => {
    if (ecoute) ecoute.stop();
    const t = $z.value; brouillonQuestion = ""; poser(t);
  };
  const $n = document.getElementById("q-nouvelle");
  if ($n) $n.onclick = () => { localStorage.removeItem(LS_QUESTION); brouillonQuestion = ""; rendreQuestion(); };
  if (conv.messages.length) setTimeout(() => { const f = document.getElementById("fil"); if (f && f.lastElementChild) f.lastElementChild.scrollIntoView({ block: "start" }); }, 0);
}

// ── Réglages : clé Claude ─────────────────────────────────────────────────
function reglagesIA() {
  return `<div class="card"><b>💬 Questions à l'IA (Claude)</b>
    <label>Clé API Claude</label><input id="ia-cle" type="password" value="${esc(cfg.claudeKey || "")}" placeholder="Laissez vide : reprise du logiciel PC">
    <p class="muted">Vide, l'appli reprend toute seule la clé du logiciel PC (dans le Drive) à la première question.</p></div>`;
}
function brancherReglagesIA() {
  const i = document.getElementById("ia-cle");
  if (i) i.onchange = () => { cfg.claudeKey = i.value.trim(); ecrire(LS.cfg, cfg); };
}
