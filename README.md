# Kittangle

Logic puzzle: free all stretchy cats from the board without bumping them into each other.
Prototype (no ads or purchases yet, simple procedural graphics).

## Run
```bash
npm install
npm run dev      # local dev server, open the printed URL (also works from a phone on the same Wi-Fi)
npm test         # core logic tests (solver, generator, saves)
npm run build    # production build into dist/
```

Dev URL params: `?reset` clears the save, `?level=37` jumps to a level, `?fish=999` sets fish, `?lang=en|ru`.

## Assets
- Art: generate per `../Art/PROMPTS.md`, then `python3 tools/art/process.py ../Art` (needs `pip install pillow rembg`). Output goes to `public/art` + `manifest.json`; missing images fall back to procedural drawing.
- Sound: generate per `../Sound/SOUNDS.md`, then `tools/audio/process.sh ../Sound/audio` (needs ffmpeg). Output goes to `public/audio`; missing sounds fall back to procedural tones.
- Level Lab: open `lab.html` (e.g. `npm run dev` then `/lab.html?n=57`).

## Structure
- `src/core` pure logic (board, solver, generator, levels, content, save), no Phaser
- `src/game` Phaser scenes and drawing
- `src/platform` IPlatform + adapters (only `local` for now)
- `src/i18n` strings (RU, EN)
