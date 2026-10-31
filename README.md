# COVENANT — The Last Bastion

A browser RPG / survival / tycoon / tower-defense game about holding the final gate while myth and scripture tear the world apart. Twenty waves, nine mythic foes, seven guardian and sanctum relics, and roguelite blessings — all drawn and scored procedurally with no assets or build step.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/PuzzleRabbit/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?style=for-the-badge&logo=github)](https://github.com/PuzzleRabbit/PlayGround)

- 🎮 [Open the project](https://omgithub.com/PuzzleRabbit/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=PuzzleRabbit%2FPlayGround).
- 💻 [Explore the source](https://github.com/PuzzleRabbit/PlayGround).
- 🛠️ [Check build runs](https://github.com/PuzzleRabbit/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/PuzzleRabbit/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/PuzzleRabbit).
- 🌍 [Create with OMGithub](https://omgithub.com).
- 🧬 [Explore the remix source](https://omgithub.com/?remix=PuzzleRabbit%2FPlayGround).
<!-- omgithub:readme:end -->

## The covenant

- **RPG** — Control the Covenant Bearer with WASD or click-to-move. He attacks on his own and unlocks Smite, Aegis, Judgement, and Wrath of Heaven.
- **Survival** — Every foe that reaches the Gate breaks a seal. At zero seals, the run ends.
- **Tycoon** — Raise Manna Wells, Reliquaries, and Oracle Tents in the sanctum courts. They pay tribute at the end of each wave.
- **Tower defense** — Place four kinds of guardian on rune pads, then upgrade or sell them. Slow, poison, armour pierce, and range auras reward smart placement.
- **Roguelite** — Level up and choose one of fourteen blessings; no two runs need take the same shape.

## Play

- **WASD / arrows / click** — move the Bearer
- **Q** — Smite, **C** — Aegis, **E** — Judgement, **R** — Wrath of Heaven
- **1–7** — choose a guardian or sanctum relic
- **Space** — sound the horn and begin a wave
- **F** — toggle game speed, **M** — mute, **P / Esc** — pause, **H** — field manual

Portrait phones are asked to rotate; the battlefield is designed for landscape.

## Run locally

```bash
PORT=3002 ./start.sh          # OMGithub runtime
python3 -m http.server 3002   # or any static file server
```

Open `http://localhost:3002`. The game is plain HTML, CSS, and ES modules — no install or build step.

## Tests

The rules layer has no DOM dependencies and is covered by Node's built-in test runner:

```bash
node --experimental-default-type=module --test tests/logic.test.js
```

## Structure

- `index.html` — interface, overlays, and inline icon set
- `styles.css` — responsive gold-and-ink art direction
- `src/logic.js` — pure data and rules (waves, towers, economy, blessings)
- `src/audio.js` — procedural Web Audio score and effects
- `src/game.js` — the canvas engine
- `src/parts/` — readable source sections that concatenate into `src/game.js`
