// Prism Drift — the hand-in program for the make.fun best-game-01 entry (Node 22, standard
// library only, deterministic: the same repository always produces the same output bytes).
// The game itself is the static site in game/ beside this file; this program's whole job is to
// hand it in exactly the way the bounty asks: copy game/ and screenshots/ into the output
// directory and write dossier.json there with the vendored buildDossier library, whose bytes
// the scorer compares against its own rebuild of the same files.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR pointing at a scratch directory:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps for this competition, passed whole so this program refuses anything the
// scorer would refuse instead of writing a dossier it would reject.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn(folder: string): void {
  const from = join(repoDir, folder);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, folder), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
handIn('game');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
handIn('screenshots');

const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Prism Drift handed in: ${dossier.length} dossier bytes in ${outputDir}`);
