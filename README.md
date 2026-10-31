# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/PuzzleRabbit/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/PuzzleRabbit/PlayGround)

- 🎮 [Open the project](https://omgithub.com/PuzzleRabbit/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=PuzzleRabbit%2FPlayGround).
- 💻 [Explore the source](https://github.com/PuzzleRabbit/PlayGround).
- 🛠️ [Check build runs](https://github.com/PuzzleRabbit/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/PuzzleRabbit/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/PuzzleRabbit).
- 🌍 [Create with OMGithub](https://omgithub.com).
- 🧬 [Explore the remix source](https://github.com/PuzzleRabbit/PlayGround).
<!-- omgithub:readme:end -->

## 🦴 WAMMER DUDES

A hand-drawn stone age beat-'em-up that runs entirely in the browser. Club your way through Fire Valley, clear seven fights, and topple Mammoth Mog before the Bonefang tribe bonks you first.

Everything is procedural canvas art and synthesized WebAudio — no image or audio files to load beyond the bundled display font.

### Play

Serve the folder and open it in a browser:

```bash
python3 -m http.server 3002
# then visit http://localhost:3002
```

### Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` / arrow keys | Left joystick |
| Bonk (combo) | `J` / `X` | BONK |
| Jump | `K` / `Z` / `Space` | JUMP |
| Rage (when full) | `L` / `C` | RAGE |
| Pause | `P` / `Esc` | — |
| Mute | `M` | Speaker button |

### Source layout

- `index.html` — shell, title/pause/game-over/victory overlays
- `styles.css` — presentation and responsive/touch layout
- `src/game.js` — main loop, waves, camera, run flow
- `src/actors.js` — player, enemy, and boss behavior
- `src/art.js` — cached procedural background, characters, HUD, banners
- `src/audio.js` — synthesized music and SFX
- `src/config.js` — tuning constants, wave table, attack stats
- `src/fx.js` — particles, rings, floating text
- `src/input.js` — keyboard and touch input

