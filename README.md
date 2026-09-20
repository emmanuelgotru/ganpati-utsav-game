#  Ganpati Utsav — Festival Manager

A complete **Ganesh Chaturthi festival management game** built with pure HTML5 Canvas + DOM + WebAudio.
No external assets, no frameworks, no build step — every sprite is drawn programmatically and every
sound is synthesized live.

Guide your mandal through the full **30-day countdown** across six phases:

| Days | Phase | What you do |
|------|-------|-------------|
| 1–6  | 💰 Chanda Collection | Walk the neighborhood, talk to residents, collect donations |
| 7–12 | 📋 Planning & Procurement | Allocate the budget, haggle in the market, hire contractors |
| 13–18 | 🔨 Pandal Construction | Manage workers, morale & random events; pick lights & theme |
| 19   | 🚚 Agaman | Escort the idol through town — energy management mini-game |
| 20–29| 🪔 Utsav | Schedule daily events, design the visitor flow, handle crises |
| 30   | 🌊 Visarjan | Order the procession convoy, farewell fireworks, eco immersion |

Then get graded on **Budget · Creativity · Reputation · Visitor Satisfaction**, with an
eco-friendly bonus multiplier (clay idol, natural colors, immersion tank).

## Features

- Two difficulties: 🏘️ *Galli Mandal* (alley) and 🏙️ *Raja Mandal* (city-level)
- Dynamic day/night cycle and weather (sunny / cloudy / rain)
- Synthesized soundtrack: dhol-tasha beats, shehnai-like pads, crowd murmur, fireworks, coins
- Spatial-style audio panning, particle effects, fireworks, rain
- Dialog trees with timed choices, haggling mini-game, crowd-flow puzzle, convoy puzzle
- Touch controls (virtual joystick + action button) — playable on mobile
- S/A/B/C/D grading with an eco multiplier

## Controls

- **WASD / Arrows** — walk (Phase 1)
- **E / Space / tap 🔔** — talk & confirm
- **N** — end day / advance
- Mouse / touch for all menus

## Run locally

Any static server works (no build step):

```bash
python3 server.py        # bundled no-cache static server on :3000
# or
npx serve .
```

## Deploy

Static site — deploys as-is to Vercel / Netlify / GitHub Pages (`vercel.json` included).

## Tech

- `index.html` + `css/style.css` — shell, HUD, dialogs, sheets
- `js/util.js` — helpers, input, particles, WebAudio synth engine
- `js/art.js` — all procedural vector art (Ganesha, pandal, streets, vehicles…)
- `js/state.js` — global state, difficulties, scoring, dialog engine
- `js/phase1.js … phase6.js` — the six gameplay phases
- `js/main.js` — boot, render loop, title screen, resize/touch wiring

Made with ❤️ for Ganesh Utsav. *Ganpati Bappa Morya!*
