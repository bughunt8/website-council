import { downloadVerdictPdf } from "./pdf.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (s) => String(s ?? "").replace(/\*\*/g, "").replace(/[—–]/g, ", ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const short = (s, n = 205) => { const t = clean(s); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; };
const state = { seats: [], sessions: [], session: null, frames: [], cursor: -1, playing: false, timer: null, speed: 1, cards: {}, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" };
const portrait = (key) => `./portraits/${key}-base.webp`;
const seatOf = (key) => state.seats.find((s) => s.key === key);
const announce = (message) => { $("#status-message").textContent = message; };
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("#theme-toggle").setAttribute("aria-label", `Switch to ${state.theme === "light" ? "dark" : "light"} theme`);
}
applyTheme();
$("#theme-toggle").addEventListener("click", () => { state.theme = state.theme === "light" ? "dark" : "light"; applyTheme(); });
if (location.hostname.includes("staging") || location.hostname === "127.0.0.1" || location.hostname === "localhost") $("#staging-banner").hidden = false;
$$(".close-dialog").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
$$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } }));
["#nav-guide", "#footer-guide"].forEach((s) => $(s).addEventListener("click", () => $("#guide-dialog").showModal()));
$("#nav-room").addEventListener("click", () => $(".workspace").scrollIntoView({ behavior: "smooth" }));
$("#prepare-button").addEventListener("click", () => $("#brief-dialog").showModal());
$("#session-select").addEventListener("change", () => selectSession($("#session-select").value));
$("#watch-button").addEventListener("click", startReplay);
$("#replay-button").addEventListener("click", startReplay);
$("#pause-button").addEventListener("click", () => {
  state.playing = !state.playing;
  $("#pause-button").textContent = state.playing ? "Pause" : "Resume";
  $("#room-status").textContent = state.playing ? "Recorded example · replaying" : "Recorded example · paused";
  clearTimeout(state.timer);
  if (state.playing) schedule();
});
$("#speed").addEventListener("change", () => {
  state.speed = Number($("#speed").value);
  if (state.playing) { clearTimeout(state.timer); schedule(); }
});
$("#skip-button").addEventListener("click", () => seek(state.frames.findIndex((e) => e.type === "verdict")));
$$("[data-chapter]").forEach((b) => b.addEventListener("click", () => {
  const chapter = b.dataset.chapter;
  const index = state.frames.findIndex((e) => chapter === "verdict" ? e.type === "verdict" : e.type === "seat_done" && e.round === Number(chapter));
  if (index >= 0) seek(index);
}));
$("#verdict-button").addEventListener("click", openVerdict);
$("#pdf-button").addEventListener("click", async () => {
  const btn = $("#pdf-button");
  btn.disabled = true; btn.textContent = "Preparing PDF…"; $("#pdf-error").hidden = true;
  try {
    const setup = state.session.events.find((e) => e.type === "setup");
    const verdict = state.session.events.find((e) => e.type === "verdict");
    await downloadVerdictPdf({ setup, verdict, byKey: Object.fromEntries(state.seats.map((s) => [s.key, s])), id: state.session.id });
    announce("Verdict PDF downloaded.");
  } catch (error) {
    $("#pdf-error").textContent = "The PDF could not be created. Try again or download the text report.";
    $("#pdf-error").hidden = false;
    console.error(error);
  } finally { btn.disabled = false; btn.textContent = "Download verdict PDF"; }
});
$("#markdown-button").addEventListener("click", () => {
  const v = state.session.events.find((e) => e.type === "verdict").verdict;
  const setup = state.session.events.find((e) => e.type === "setup");
  const md = [
    `# Council: ${clean(setup.title)}`, "", "Recorded upstream example. Not a new AI response.", "",
    `## ${v.label}`, "", clean(v.call), "", "## Options and scores", "",
    ...setup.options.map((o) => `- ${o.id}: ${clean(o.label)}. ${v.scores[o.id]?.score ?? "-"}/10`),
    "", "## Why", "", ...v.why.map((w) => `- ${clean(w.point)}. Simulated ${w.seat} seat.`),
    "", "## Conditions", "", ...v.conditions.map((c) => `- ${clean(c)}`),
    "", "## Minority report", "", clean(v.minority.quote), "",
    "## Next steps", "", ...v.next_steps.map((n) => `- ${clean(n.when)}: ${clean(n.action)}`),
    "", "## Cheapest test", "", clean(v.cheapest_test), "", "## Kill criteria", "", clean(v.kill_criteria), "",
    "## Revisit", "", clean(v.revisit), "", clean(v.disclaimer), "",
    "Adapted from [Roast Room](https://github.com/nateherkai/roast-room).",
    "Council by Ronald Ng: https://github.com/bughunt8/website-council", "",
  ].join("\n");
  download(`${state.session.id}-verdict.md`, md, "text/markdown");
});

async function boot() {
  $("#load-error").hidden = true; $("#retry-button").hidden = true;
  try {
    const response = await fetch("./data/catalog.json");
    if (!response.ok) throw new Error("catalog unavailable");
    const data = await response.json();
    if (!data.seats?.length || !data.sessions?.length) throw new Error("empty catalog");
    state.seats = data.seats; state.sessions = data.sessions;
    $("#advisors").innerHTML = state.seats.map((s) => `<button type="button" class="advisor" data-seat="${esc(s.key)}" aria-label="${esc(s.name)}, ${esc(s.pillar)}. Read perspective."><img class="portrait" src="${portrait(s.key)}" width="175" height="175" alt="Illustrated simulation of ${esc(s.name)}" decoding="async"><span class="nameplate">${esc(s.short)}</span></button>`).join("");
    $$("[data-seat]").forEach((b) => b.addEventListener("click", () => openAdvisor(b.dataset.seat)));
    imageFallbacks();
    $("#session-select").innerHTML = state.sessions.map((s) => `<option value="${esc(s.id)}">${esc(s.publicTitle)}</option>`).join("");
    $("#session-select").disabled = false;
    await selectSession(state.sessions[0].id);
  } catch (error) {
    $("#load-error").textContent = "The examples could not be loaded. Check your connection and try again.";
    $("#load-error").hidden = false; $("#retry-button").hidden = false;
    $("#room-status").textContent = "Examples unavailable";
    console.error(error);
  }
}
$("#retry-button").addEventListener("click", boot);
let requestEpoch = 0;
async function selectSession(id) {
  const epoch = ++requestEpoch;
  clearTimeout(state.timer); state.playing = false;
  $("#watch-button").disabled = true; $("#watch-button").textContent = "Loading example…";
  $("#load-error").hidden = true; $("#retry-button").hidden = true;
  resetView();
  try {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) throw new Error("unknown example");
    const r = await fetch(`./data/${encodeURIComponent(id)}.json`);
    if (!r.ok) throw new Error("session unavailable");
    const j = await r.json();
    if (epoch !== requestEpoch) return;
    state.session = j; state.frames = j.events.filter((e) => ["seat_done", "cruxes", "draft", "verdict"].includes(e.type));
    state.cursor = -1; state.cards = {};
    $("#decision-title").textContent = session.publicTitle;
    $("#decision-description").textContent = session.summary;
    $("#decision-facts").innerHTML = session.facts.map(([value, label]) => `<div class="fact"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join("");
    renderOptions();
    $("#watch-button").disabled = false; $("#watch-button").innerHTML = 'Watch this council <span aria-hidden="true">→</span>';
    $("#room-status").textContent = "Public example · ready to replay";
  } catch (error) {
    if (epoch !== requestEpoch) return;
    state.session = null;
    $("#load-error").textContent = "This example could not be loaded. Choose another or retry.";
    $("#load-error").hidden = false; $("#retry-button").hidden = false;
    $("#watch-button").textContent = "Example unavailable";
    $("#room-status").textContent = "Example unavailable";
  }
}
function resetView() {
  $("#room").classList.remove("is-playing");
  $$(".advisor").forEach((b) => b.classList.remove("speaking"));
  $("#speaker-label").textContent = "A seat for every blind spot";
  $("#speaker-text").innerHTML = "Strategy. Product. Pricing. Attention.<br>People. Operations. Capital.";
  $("#speaker-hint").textContent = "Select an advisor to explore their perspective.";
  $("#transcript-section").hidden = true; $("#transcript").innerHTML = "";
  $("#playback-actions").hidden = true; $("#launch-actions").hidden = false; $("#result-actions").hidden = true;
  $$("[data-chapter]").forEach((b) => { b.disabled = true; b.classList.remove("active", "done"); });
}
function renderOptions(verdict) {
  const setup = state.session?.events.find((e) => e.type === "setup");
  if (!setup) return;
  $("#decision-options").innerHTML = setup.options.map((o) => `<div class="option ${verdict?.recommended === o.id ? "recommended" : ""}"><span class="option-key">${esc(o.id)}</span><span>${esc(o.label)}</span><span class="option-score">${verdict ? `${verdict.scores[o.id]?.score ?? "-"}/10` : ""}</span></div>`).join("");
}
function startReplay() {
  if (!state.session) return;
  clearTimeout(state.timer); resetView(); renderOptions();
  state.cursor = -1; state.cards = {}; state.playing = true;
  $("#transcript-section").hidden = false; $("#playback-actions").hidden = false; $("#launch-actions").hidden = true;
  $("#pause-button").textContent = "Pause"; $("#room-status").textContent = "Recorded example · replaying";
  $$("[data-chapter]").forEach((b) => {
    b.disabled = b.dataset.chapter !== "verdict" && !state.frames.some((e) => e.type === "seat_done" && e.round === Number(b.dataset.chapter));
  });
  next();
}
function next() {
  if (!state.playing) return;
  state.cursor++;
  if (state.cursor >= state.frames.length) { finish(); return; }
  renderFrame(state.frames[state.cursor]);
  if (state.playing) schedule();
}
function schedule() { state.timer = setTimeout(next, 6500 / state.speed); }
function renderFrame(frame, silent = false) {
  $$(".advisor").forEach((b) => b.classList.toggle("speaking", b.dataset.seat === frame.seat));
  $("#room").classList.add("is-playing");
  if (frame.type === "seat_done") {
    const s = seatOf(frame.seat);
    state.cards[`${frame.round}-${frame.seat}`] = frame;
    const text = frame.parsed.oneLine || frame.parsed.call || frame.parsed.disagreeLine || frame.parsed.stance;
    if (!silent) {
      $("#speaker-label").textContent = `${s.name} · ${["", "Opening", "Debate", "Vote"][frame.round]}`;
      $("#speaker-text").textContent = short(text, matchMedia("(max-width:500px)").matches ? 125 : 220);
      $("#speaker-hint").textContent = "Simulated perspective. Read the full card below.";
      setChapter(String(frame.round));
      announce(`${s.short} is speaking. ${short(text, 100)}`);
    }
    const b = document.createElement("button");
    b.type = "button"; b.className = "contribution"; b.dataset.contribution = `${frame.round}-${frame.seat}`;
    b.innerHTML = `<img src="${portrait(frame.seat)}" width="48" height="48" alt=""><div><b>${esc(s.name)} <small> / ${["", "Opening", "Debate", "Vote"][frame.round]}</small></b><p>${esc(clean(text))}</p></div>`;
    b.addEventListener("click", () => openAdvisor(frame.seat, frame.round));
    $("#transcript").appendChild(b);
  } else if (frame.type === "cruxes" && !silent) {
    $("#speaker-label").textContent = "The Chair · fault lines";
    $("#speaker-text").textContent = short(frame.cruxes.map((c) => c.question).join(" "), matchMedia("(max-width:500px)").matches ? 125 : 220);
    $("#speaker-hint").textContent = "Where the advisors disagree.";
  } else if (frame.type === "draft" && !silent) {
    $("#speaker-label").textContent = "The Chair · proposal";
    $("#speaker-text").textContent = short(frame.draft.recommendation, matchMedia("(max-width:500px)").matches ? 125 : 220);
    $("#speaker-hint").textContent = "A proposal, not yet a verdict.";
  } else if (frame.type === "verdict" && !silent) {
    finish();
  }
}
function setChapter(chapter) {
  const order = ["1", "2", "3", "verdict"];
  $$("[data-chapter]").forEach((b) => { b.classList.toggle("active", b.dataset.chapter === chapter); b.classList.toggle("done", order.indexOf(b.dataset.chapter) < order.indexOf(chapter)); });
}
function seek(index) {
  if (index < 0 || !state.session) return;
  clearTimeout(state.timer);
  const wasPlaying = state.playing;
  $("#transcript").innerHTML = ""; state.cards = {};
  for (let i = 0; i < index; i++) renderFrame(state.frames[i], true);
  state.cursor = index; state.playing = wasPlaying;
  renderFrame(state.frames[index]);
  if (state.playing) schedule();
}
function finish() {
  clearTimeout(state.timer); state.playing = false;
  $("#room").classList.remove("is-playing");
  $$(".advisor").forEach((b) => b.classList.remove("speaking"));
  const v = state.session.events.find((e) => e.type === "verdict").verdict;
  $("#speaker-label").textContent = `The council's verdict · ${v.label}`;
  $("#speaker-text").textContent = short(v.call, matchMedia("(max-width:500px)").matches ? 125 : 200);
  $("#speaker-hint").textContent = "Read the full reasoning, dissent, and conditions.";
  $("#room-status").textContent = "Recorded example · verdict reached";
  $("#playback-actions").hidden = true; $("#result-actions").hidden = false;
  setChapter("verdict"); renderOptions(v);
  announce("The recorded council has reached its verdict.");
}
function openAdvisor(key, round) {
  const seat = seatOf(key);
  const rounds = [1, 2, 3].filter((r) => state.cards[`${r}-${key}`]);
  const card = state.cards[`${round || rounds.at(-1)}-${key}`];
  $("#advisor-body").innerHTML = `<div class="advisor-profile"><img src="${portrait(key)}" width="100" height="100" alt="Illustrated ${esc(seat.name)} simulation"><div><h2 id="advisor-dialog-title">${esc(seat.name)}</h2><p>${esc(seat.pillar)}</p></div></div><p>${esc(seat.question)}</p>${rounds.length ? `<div class="round-tabs">${rounds.map((r) => `<button type="button" class="small-button ${card?.round === r ? "active" : ""}" data-card-round="${r}">${["", "Opening", "Debate", "Vote"][r]}</button>`).join("")}</div>` : ""}${card ? `<pre>${esc(clean(card.text))}</pre>` : `<h3>What this seat tests</h3><p>${esc(seat.dimension)}. Replay an example to see this simulated advisor's arguments and scores.</p>`}<p class="helper">This is a simulation based on public work, not the person. No affiliation or endorsement.</p><a class="text-button" href="https://github.com/bughunt8/website-council/blob/main/.claude/skills/roast-room/brains/${esc(seat.slug)}/sources.md" target="_blank" rel="noopener noreferrer">Read the upstream source notes ↗</a>`;
  $$("[data-card-round]").forEach((b) => b.addEventListener("click", () => openAdvisor(key, Number(b.dataset.cardRound))));
  if (!$("#advisor-dialog").open) $("#advisor-dialog").showModal();
}
function openVerdict() {
  const setup = state.session.events.find((e) => e.type === "setup");
  const ev = state.session.events.find((e) => e.type === "verdict");
  const v = ev.verdict;
  $("#verdict-body").innerHTML = `<span class="verdict-label">${esc(v.label)} · Option ${esc(v.recommended)} · Confidence ${esc(v.confidence)}/10</span><h2 id="verdict-dialog-title">${esc(setup.title)}</h2><p class="verdict-call">${esc(clean(v.call))}</p><div class="verdict-grid"><div><h3>Option scores</h3>${setup.options.map((o) => `<div class="option ${v.recommended === o.id ? "recommended" : ""}"><span>${esc(o.id)}</span><span>${esc(o.label)}</span><b>${esc(v.scores[o.id]?.score ?? "-")}/10</b></div>`).join("")}<p class="helper">Scores are the recorded council's judgments, not probabilities or verified forecasts.</p></div><div><h3>Why they landed here</h3><ul>${v.why.map((w) => `<li>${esc(clean(w.point))}<br><span class="tiny-label">Simulated ${esc(w.seat)} perspective</span></li>`).join("")}</ul></div><div><h3>The strongest objection</h3><p>${esc(clean(v.minority.quote))}</p><p class="helper">${esc(v.minority.seat)} seat. ${esc(clean(v.minority.would_have_to_be_true))}</p></div><div><h3>Next steps</h3><ul>${v.next_steps.map((n) => `<li><b>${esc(n.when)}</b> ${esc(clean(n.action))}</li>`).join("")}</ul></div></div><details class="verdict-detail"><summary>Conditions, tests, and the complete scorecard</summary><h3>Conditions</h3><ul>${v.conditions.map((c) => `<li>${esc(clean(c))}</li>`).join("")}</ul><h3>Cheapest test</h3><p>${esc(clean(v.cheapest_test))}</p><h3>Stop if</h3><p>${esc(clean(v.kill_criteria))}</p><h3>Revisit</h3><p>${esc(clean(v.revisit))}</p><h3>Where they fought</h3><ul>${v.fights.map((f) => `<li><b>${esc(clean(f.crux))}</b> ${esc(clean(f.story))}</li>`).join("")}</ul><h3>Scorecard</h3><div class="table-scroll"><table><thead><tr><th scope="col">Advisor</th><th scope="col">Weight</th>${setup.options.map((o) => `<th scope="col">Option ${esc(o.id)}</th>`).join("")}</tr></thead><tbody>${ev.seats.map((s) => `<tr><th scope="row">${esc(seatOf(s.key)?.name || s.key)}</th><td>${esc(s.weight)}</td>${setup.options.map((o) => `<td>${esc(s.optionScores?.[o.id] ?? "-")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details><p class="helper">${esc(clean(v.disclaimer))} Recorded example from Roast Room. Adaptation by Ronald Ng.</p>`;
  $("#pdf-error").hidden = true;
  $("#verdict-dialog").showModal();
}
function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#brief-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const fields = [["decision", "Decision"], ["options", "Options"], ["numbers", "Numbers"], ["limits", "Limits"], ["success", "Success"], ["lean", "My current lean"]];
  const sections = fields.filter(([key]) => String(form.get(key)).trim()).map(([key, label]) => `${label}: ${String(form.get(key)).trim()}`);
  $("#brief-command").value = `/roast-room${$("#brief-quick").checked ? " --quick" : ""} ${sections.join("\n\n")}`;
  $("#brief-output").hidden = false; $("#copy-feedback").textContent = "";
  $("#brief-command").focus(); $("#brief-command").select();
});
$("#copy-command").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#brief-command").value); $("#copy-feedback").textContent = "Copied. Paste into your local Claude Code session."; }
  catch { $("#brief-command").focus(); $("#brief-command").select(); $("#copy-feedback").textContent = "Clipboard access is unavailable here. The command is selected for manual copying, or download the brief."; }
});
$("#download-command").addEventListener("click", () => download("council-private-brief.txt", $("#brief-command").value, "text/plain"));
function imageFallbacks() {
  $$("img").forEach((img) => img.addEventListener("error", () => {
    const fallback = document.createElement("span"); fallback.className = "img-fallback"; fallback.setAttribute("role", "img"); fallback.setAttribute("aria-label", img.alt || "Advisor illustration"); fallback.textContent = img.alt || "Advisor";
    img.replaceWith(fallback);
  }, { once: true }));
}
boot();
