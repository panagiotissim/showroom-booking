import crypto from "crypto";

export function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(raw: string) {
  const secret = process.env.TOKEN_SIGNING_SECRET!;
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}
