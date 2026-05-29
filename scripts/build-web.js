const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "web");
const target = path.join(root, "dist");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

fs.rmSync(target, { recursive: true, force: true });
copyDir(source, target);

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
};
fs.writeFileSync(
  path.join(target, "config.js"),
  `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`
);

console.log(`Built static web app to ${target}`);
