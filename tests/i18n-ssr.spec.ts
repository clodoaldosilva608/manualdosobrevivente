import { describe, expect, it } from "vitest";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

const ENGLISH =
  /\b(the|and|for|with|save|load|search|download|upload|settings|login|logout|error|success|loading|cancel|confirm|delete|home|about|password|submit|send|update|create|remove|category|description|notes|distance|speed|altitude|elevation|heading|bearing|north|south|east|west|route|track|marker|menu|back|next|previous|close)\b/i;

const ALLOW = new Set([
  "mgrs",
  "gps",
  "sos",
  "gpx",
  "kml",
  "google",
  "gis",
  "tactical",
  "waypoint",
  "waypoints",
  "app",
  "bug",
  "out",
  "bag",
]);

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  expect(res.status).toBe(200);
  return await res.text();
}

describe("SSR em pt-BR", () => {
  for (const path of ["/", "/login", "/manual", "/sos", "/settings", "/inventory"]) {
    it(`${path} declara lang="pt-BR"`, async () => {
      const html = await get(path);
      expect(html).toMatch(/<html[^>]*lang="pt-BR"/);
    });

    it(`${path} não mostra texto em inglês`, async () => {
      const html = await get(path);
      const words =
        visibleText(html)
          .toLowerCase()
          .match(/[a-zà-ÿ']+/g) ?? [];
      const bad = [...new Set(words.filter((w) => ENGLISH.test(w) && !ALLOW.has(w)))];
      expect(bad).toEqual([]);
    });
  }

  it("declara og:locale pt_BR", async () => {
    const html = await get("/");
    expect(html).toMatch(/og:locale[\s\S]{0,80}pt_BR/);
  });
});
