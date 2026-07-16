import type { NextConfig } from "next";
import path from "node:path";

// ⚠️ Épingle la racine sur CE projet. Empêche Next/Turbopack de remonter dans le
// dossier parent (VibeCoding/) et de surveiller des gigaoctets de fichiers voisins
// (node_modules, vidéos…). Sans ça, le file-watcher fait exploser la mémoire et fige
// le Mac (hard reset obligatoire). NE PAS RETIRER ces deux lignes.
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  /* config options here */
};

export default nextConfig;
