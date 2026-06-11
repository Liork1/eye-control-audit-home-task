import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  const envPath = resolve(__dirname, ".env");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^JWT_SECRET=(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  }

  throw new Error(
    "JWT_SECRET not found. Set it in docker/.env or as an environment variable."
  );
}

const secret = new TextEncoder().encode(loadJwtSecret());

const token = await new SignJWT({
  role: "anon",
  iss: "supabase",
  ref: "local",
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("10y")
  .sign(secret);

console.log(token);
