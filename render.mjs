// Render-runner voor Isa (draait gratis in GitHub Actions). Stappen:
// 1. post.json lezen (van n8n via workflow_dispatch)
// 2. Reel bouwen (build.mjs): tekst in huisstijl met gratis geluidseffecten, geen voice-over
// 3. HyperFrames check + render, cover maken
// 4. MP4 en cover publiceren als release-asset en de URL terugsturen naar de n8n-webhook
// Geheimen komen uit de omgeving (GitHub Secrets): N8N_CALLBACK_URL, N8N_CALLBACK_TOKEN.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });
const post = JSON.parse(process.env.POST_JSON || fs.readFileSync("post.json", "utf8"));
const key = String(post.post_key || "").replace(/[^a-z0-9-]/gi, "");
if (!key) throw new Error("post_key ontbreekt");
fs.writeFileSync("post.json", JSON.stringify(post));
fs.mkdirSync("out", { recursive: true });

// 2 en 3. Bouwen, controleren, renderen
run("node", ["build.mjs", "post.json", "template"]);
run("npx", ["hyperframes", "check", "--json"], { cwd: "template" });
run("npx", ["hyperframes", "render", "--quality", "delivery", "--output", `../out/${key}.mp4`], { cwd: "template" });
run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.8", "-i", `out/${key}.mp4`, "-frames:v", "1", "-q:v", "3", `out/${key}-cover.jpg`]);
const duur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `out/${key}.mp4`]).toString());
if (!(duur > 3 && duur < 91)) throw new Error("Onverwachte videoduur: " + duur);

// 4. Publiceren als release-asset (publieke URL die Instagram kan ophalen) en n8n laten weten dat de video klaar is
const repo = process.env.GITHUB_REPOSITORY, tag = "reel-" + key;
run("gh", ["release", "create", tag, `out/${key}.mp4`, `out/${key}-cover.jpg`, "--title", tag, "--notes", "Automatisch gerenderd door Isa"]);
const base = `https://github.com/${repo}/releases/download/${tag}`;
const cb = await fetch(process.env.N8N_CALLBACK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Isa-Token": process.env.N8N_CALLBACK_TOKEN || "" },
  body: JSON.stringify({ post_key: post.post_key, video_url: `${base}/${key}.mp4`, cover_url: `${base}/${key}-cover.jpg`, seconden: +duur.toFixed(1) })
});
console.log("Callback n8n:", cb.status);
