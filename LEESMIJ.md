# Vakwerk Reels: video-render voor Isa

Isa maakt elke dag een post. Bij een Reel zet deze map de post om naar een MP4 van 1080×1920.

## Hoe het werkt

1. **n8n, workflow 1 (Dagproductie):** na de tekstcontrole stuurt de node *Video laten renderen* de post naar GitHub:
   - via `POST https://api.github.com/repos/<eigenaar>/vakwerk-reels/actions/workflows/render.yml/dispatches`;
   - met body `{"ref":"main","inputs":{"post":"<json>"}}`.
2. **GitHub Action `render.yml`:** gratis minuten, met Ubuntu, Chrome en FFmpeg. De Action:
   - bouwt de video met `build.mjs`, in de huisstijl en met de scènetypes van de carrousel;
   - voert `hyperframes check` uit en rendert met `hyperframes render`;
   - zet de MP4 en de cover als release-asset neer, op een publieke URL die Instagram kan ophalen;
   - meldt `video_url` en `cover_url` aan n8n.
3. **n8n, nieuwe webhook "Isa – video klaar":** zet de URL's in `vw_posts` (velden `media_urls` en `cover_url`). Workflow 2 publiceert de Reel daarna als `REELS` met `video_url`.

## Geluid

- **Effecten:** `template/assets/sfx/`, onder de Pixabay-licentie. Die mag je commercieel gebruiken zonder naamsvermelding; zie `CREDITS.md`. Er klinkt een whoosh bij elke scènewissel en een pop bij de laatste scène.
- **Voice-over:** geen. Simpele video met tekst, net als de demovideo's op de site. Kost niets.
- **Muziek:** geen, zodat er geen licentiekosten zijn.

## Wat Max eenmalig moet doen

1. Een GitHub-repo `vakwerk-reels` aanmaken en deze map erin zetten. Een publieke repo heeft onbeperkte gratis minuten. Een privé-repo kan ook, maar de release-URL's zijn dan niet publiek.
2. In GitHub onder Settings → Secrets deze geheimen zetten:
   - `N8N_CALLBACK_URL`
   - `N8N_CALLBACK_TOKEN`
3. In n8n een credential "GitHub (Isa render)" aanmaken: een fine-grained token met alleen *Actions: read/write* op deze repo.

Max zet de sleutels zelf; ze komen nooit in de code of in een chat.

## Lokaal testen

```bash
node build.mjs voorbeeld-post.json template
cd template && npx hyperframes check && npx hyperframes render --quality looks --output ../test-reel.mp4
```

`test-reel.mp4` is een proefrender van de reservepost "Klacht komt eerst bij jou", zonder stem.
