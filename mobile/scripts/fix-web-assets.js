/**
 * Après « expo export --platform web » : Cloudflare Pages n'envoie pas les dossiers
 * nommés « node_modules ». Les polices et les icônes (dist/assets/node_modules/...)
 * étaient donc introuvables en ligne. On renomme ce dossier en « vendor »
 * et on met à jour les chemins dans les fichiers générés.
 */
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
const from = path.join(dist, "assets", "node_modules");
const to = path.join(dist, "assets", "vendor");

if (!fs.existsSync(from)) {
  console.log("fix-web-assets : rien à renommer.");
  process.exit(0);
}
fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

let files = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(js|html|css|json|map)$/.test(entry.name)) {
      const text = fs.readFileSync(p, "utf8");
      if (text.includes("/assets/node_modules/")) {
        fs.writeFileSync(p, text.split("/assets/node_modules/").join("/assets/vendor/"));
        files += 1;
      }
    }
  }
})(dist);
console.log(`fix-web-assets : polices et icônes déplacées dans assets/vendor (${files} fichier(s) mis à jour).`);
