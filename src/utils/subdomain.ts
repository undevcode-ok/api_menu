import crypto from "crypto";
import { User } from "../models/User";

const MAX_SUBDOMAIN_LENGTH = 63;
const HASH_LENGTH = 4;
const HASH_ATTEMPTS = 64;
const FALLBACK_WORDS = ["menu", "carta", "sabor", "gusto", "chef", "resto"];

function cleanValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromName(firstName: string, lastName: string) {
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (!combined) return "";
  return cleanValue(combined);
}

function shortHash() {
  return crypto.randomBytes(2).toString("hex").slice(0, HASH_LENGTH);
}

function fallbackSlug() {
  const idx = crypto.randomInt(0, FALLBACK_WORDS.length);
  return `${FALLBACK_WORDS[idx]}-${shortHash()}`;
}

function truncateForHash(slug: string) {
  const limit = MAX_SUBDOMAIN_LENGTH - (HASH_LENGTH + 1);
  if (limit <= 0) return slug;
  return slug.slice(0, limit);
}

async function exists(subdomain: string) {
  const found = await User.findOne({ where: { subdomain } });
  return Boolean(found);
}

export async function generateUserSubdomain(firstName: string, lastName: string): Promise<string> {
  let base = slugFromName(firstName, lastName);
  if (!base) {
    base = fallbackSlug();
  }
  base = base.slice(0, MAX_SUBDOMAIN_LENGTH) || fallbackSlug();

  if (!(await exists(base))) {
    return base;
  }

  let prefix = truncateForHash(base);
  for (let attempt = 0; attempt < HASH_ATTEMPTS; attempt += 1) {
    const candidate = `${prefix}-${shortHash()}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  while (true) {
    prefix = truncateForHash(fallbackSlug());
    const candidate = `${prefix}-${shortHash()}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
}
