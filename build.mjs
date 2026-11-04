// Bouwt een HyperFrames-Reel (1080x1920) uit een Isa-post (slides + optionele voice-over).
// Gebruik: node build.mjs <post.json> [projectmap]
// - Scènes: text, number, quote, contrast, checklist, steps, screen, cta (zelfde types als de carrousel).
// - Geluid: licentievrije effecten (Pixabay-licentie) uit assets/sfx op elke scènewissel.
// - Voice-over: assets/voice.mp3 als die bestaat (HeyGen TTS in de render-runner); de duur bepaalt de scènelengtes.
// - Muziek: assets/music.mp3 als die bestaat (alleen tracks met vastgelegde commerciële licentie), zacht onder de stem.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [, , postFile = "voorbeeld-post.json", dir = "template"] = process.argv;
const post = JSON.parse(fs.readFileSync(postFile, "utf8"));
const slides = (post.slides || []).filter(s => s && s.type).slice(0, 6);
if (!slides.length) throw new Error("Post heeft geen slides");

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// *woord* = accentkleur, zoals in de carrousel
const accent = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const duur = f => { try { return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim()) || 0; } catch { return 0; } };

const voice = fs.existsSync(`${dir}/assets/voice.mp3`) ? duur(`${dir}/assets/voice.mp3`) : 0;
const music = fs.existsSync(`${dir}/assets/music.mp3`);
// Scènelengte: naar verhouding van de tekst, met minimum 2,4 s; met voice-over passend op de stem
const woorden = s => JSON.stringify(s).replace(/"[a-z_]+":/g, "").split(/\s+/).length;
const gewicht = slides.map(s => Math.max(6, woorden(s)));
const totaal = voice ? Math.max(voice + 0.8, slides.length * 2.4) : Math.min(30, slides.reduce((t, g, i) => t + Math.max(2.6, gewicht[i] * 0.32), 0));
const som = gewicht.reduce((a, b) => a + b, 0);
let t = 0;
const tijden = slides.map((s, i) => { const d = +(totaal * gewicht[i] / som).toFixed(2); const r = { start: +t.toFixed(2), dur: d }; t += d; return r; });
const lengte = +t.toFixed(2);

const thema = { dark: ["#171C1F", "#F6F7F8", "#43C6AD"], light: ["#F6F7F8", "#171C1F", "#0B7A68"], green: ["#0B7A68", "#FFFFFF", "#E3F4EF"] };
const scene = (s, i) => {
  const [bg, ink, acc] = thema[s.theme] || thema.dark;
  const id = "s" + (i + 1);
  let inner = "";
  if (s.type === "contrast") inner = `<h2 class="t">${accent(s.title)}</h2><div class="cols"><div class="col neg"><b>${esc(s.links_titel || "Zonder")}</b>${(s.zonder || []).map(x => `<p>${esc(x)}</p>`).join("")}</div><div class="col pos"><b>${esc(s.rechts_titel || "Met")}</b>${(s.met || []).map(x => `<p>${esc(x)}</p>`).join("")}</div></div>`;
  else if (s.type === "checklist" || s.type === "steps") inner = `<h2 class="t">${accent(s.title)}</h2><ul class="lijst">${(s.items || s.steps || []).map((x, k) => `<li><span>${s.type === "steps" ? k + 1 : "✓"}</span>${esc(x)}</li>`).join("")}</ul>`;
  else if (s.type === "number") inner = `<div class="num">${esc(s.num)}</div><h2 class="t">${accent(s.title)}</h2>${s.body ? `<p class="b">${esc(s.body)}</p>` : ""}`;
  else if (s.type === "quote") inner = `<h2 class="t q">“${accent(s.title)}”</h2>${s.attr ? `<p class="b">${esc(s.attr)}</p>` : ""}`;
  else if (s.type === "screen") inner = `<h2 class="t">${accent(s.title)}</h2>${s.body ? `<p class="b">${esc(s.body)}</p>` : ""}<div class="tel"><img src="assets/img/${esc(s.img)}.png" alt=""><span class="vb">VOORBEELD</span></div>`;
  else if (s.type === "cta") inner = `<h2 class="t">${accent(s.title)}</h2>${s.body ? `<p class="b">${esc(s.body)}</p>` : ""}<div class="knop">${esc(s.button || "Link in bio")}</div>`;
  else inner = `${s.kicker ? `<p class="k">${esc(s.kicker)}</p>` : ""}<h2 class="t big">${accent(s.title)}</h2>${s.body ? `<p class="b">${esc(s.body)}</p>` : ""}`;
  return `<section id="${id}" class="clip scene" data-start="${tijden[i].start}" data-duration="${tijden[i].dur}" data-track-index="0" data-track-kind="graphics" style="--bg:${bg};--ink:${ink};--acc:${acc}"><div class="wrap" id="${id}-w">${inner}<svg class="mark" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="5" fill="#20272B"/><path d="M3.5 5.5 9 15.5 16.5 3.5" stroke="#43C6AD" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div></section>`;
};

const sfx = slides.map((s, i) => i === 0 ? "" : `<audio id="sfx${i + 1}" class="clip" src="assets/sfx/${s.type === "cta" ? "pop" : "whoosh-short"}.mp3" data-start="${(tijden[i].start - 0.12).toFixed(2)}" data-volume="${voice ? 0.35 : 0.6}" data-track-index="${2 + (i % 2)}"></audio>`).join("\n");

const html = `<!doctype html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
@font-face{font-family:"Bricolage Grotesque";src:url('assets/fonts/bricolage-700.woff2') format('woff2');font-weight:700}
@font-face{font-family:"Figtree";src:url('assets/fonts/figtree-600.woff2') format('woff2');font-weight:600}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:#171C1F}
#root{width:100%;height:100%;font-family:"Figtree",sans-serif}
.scene{position:absolute;inset:0;background:var(--bg);color:var(--ink)}
.wrap{position:absolute;inset:0;padding:260px 110px 300px;display:flex;flex-direction:column;justify-content:center;gap:44px}
.t{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:96px;line-height:1.02;letter-spacing:-.02em}.t.big{font-size:118px}.t.q{font-size:100px}
.t em{font-style:normal;color:var(--acc)}
.k{font-size:40px;color:var(--acc)}.b{font-size:46px;line-height:1.3;opacity:.86}
.num{font-family:"Bricolage Grotesque";font-weight:700;font-size:260px;line-height:.9;color:var(--acc)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px}.col{border-radius:28px;padding:40px 34px;display:grid;gap:22px;align-content:start}
.col b{font-family:"Bricolage Grotesque";font-size:46px}.col p{font-size:38px;line-height:1.25}
.neg{background:rgba(127,127,127,.14)}.pos{background:#0B7A68;color:#fff}
.lijst{list-style:none;display:grid;gap:30px}.lijst li{display:flex;gap:28px;font-size:52px;line-height:1.2;align-items:flex-start}.lijst span{flex:none;width:74px;height:74px;border-radius:20px;background:var(--acc);color:var(--bg);display:grid;place-items:center;font-family:"Bricolage Grotesque";font-size:40px}
.tel{position:relative;align-self:center;width:560px;border-radius:44px;overflow:hidden;border:10px solid #20272B}.tel img{display:block;width:100%}
.vb{position:absolute;top:24px;left:24px;background:#B25E00;color:#fff;font-size:26px;padding:8px 16px;border-radius:10px;letter-spacing:.04em}
.knop{align-self:flex-start;background:#fff;color:#0B7A68;font-family:"Bricolage Grotesque";font-size:56px;padding:30px 52px;border-radius:999px}
.mark{position:absolute;left:110px;bottom:150px;width:86px;height:86px}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${lengte}" data-width="1080" data-height="1920">
${slides.map(scene).join("\n")}
${sfx}
${voice ? `<audio id="voice" class="clip" src="assets/voice.mp3" data-start="0.3" data-volume="1" data-track-index="1"></audio>` : ""}
${music ? `<audio id="music" class="clip" src="assets/music.mp3" data-start="0" data-duration="${lengte}" data-volume="${voice ? 0.12 : 0.35}" data-track-index="4"></audio>` : ""}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${slides.map((s, i) => { const id = "s" + (i + 1), st = tijden[i].start; return `tl.from("#${id}-w > *", { y: 60, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.09 }, ${(st + 0.05).toFixed(2)});`; }).join("\n")}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body></html>
`;
fs.writeFileSync(`${dir}/index.html`, html);
console.log(JSON.stringify({ scenes: slides.length, seconds: lengte, voice: !!voice, music }));
