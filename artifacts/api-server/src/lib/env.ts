import { readFileSync } from "node:fs";
import path from "node:path";

const candidates = [
  path.resolve(process.cwd(), ".env.development.local"),
  path.resolve(process.cwd(), "../../.env.development.local"),
  "/vercel/share/.env.project",
];

for (const file of candidates) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      const value = rawValue.replace(/^["']|["']$/g, "");
      if (value) process.env[key] = value;
    }
  } catch {
    // Env files are optional; process env always wins.
  }
}
