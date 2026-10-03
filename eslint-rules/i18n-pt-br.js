/**
 * Regras locais de idioma/formatação:
 * - no-english-literals: textos visíveis em inglês em JSX, atributos e toasts.
 * - use-format-util: proíbe toLocaleString/toLocaleDateString/toFixed em telas,
 *   obrigando o uso de src/lib/format.ts.
 */

const ALLOW = new Set([
  "mgrs",
  "dd",
  "dms",
  "gpx",
  "kml",
  "wms",
  "wmts",
  "sos",
  "gps",
  "hud",
  "tactical",
  "gis",
  "google",
  "email",
  "e-mail",
  "open",
  "sans",
  "regular",
  "arial",
  "unicode",
  "ms",
  "m",
  "km",
  "ha",
  "kg",
  "g",
  "nm",
  "nmi",
  "ac",
  "m²",
  "ok",
  "id",
  "url",
  "json",
  "png",
  "jpg",
  "svg",
  "utf",
  "viewport",
  "charset",
  "width",
  "height",
  "initial",
  "scale",
  "href",
  "content",
  "type",
  "name",
  "rel",
  "property",
  "app",
  "bug",
  // "menu" é palavra adotada pelo pt-BR (menu operacional, botão hambúrguer)
  "menu",
  "out",
  "bag",
  "fatwood",
  "cryptosporidium",
  "ranger",
  "frame",
  "point",
  "plow",
  "lean",
  "to",
  "a",
  "waypoint",
  "waypoints",
  "slide",
  "sidebar",
  "title",
  "water",
  "shelter",
  "danger",
  "foraging",
  "cache",
  "custom",
  "tools",
  "nutrition",
  "hydration",
  "medical",
  "warmth",
  "first-aid",
  "fire",
  "knots",
  "navigation",
  "altitude",
]);

const BAD =
  /\b(the|and|for|with|save|load|search|weight|expires|download|upload|export|import|layer|compass|flashlight|inventory|login|logout|error|success|loading|cancel|confirm|delete|edit|home|about|profile|account|password|submit|send|reset|update|create|remove|category|description|notes|date|time|today|distance|speed|altitude|elevation|heading|bearing|north|south|east|west|route|track|marker|menu|back|next|previous|close)\b/i;

const TEXT_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label"]);

function suspects(text) {
  if (!text || text.trim().length < 3) return [];
  const words = text.toLowerCase().match(/[a-zà-ÿ'-]+/g) || [];
  return [...new Set(words.filter((w) => BAD.test(w) && !ALLOW.has(w)))];
}

const noEnglishLiterals = {
  meta: {
    type: "problem",
    docs: { description: "Impede textos visíveis em inglês (aplicação é pt-BR)." },
    schema: [],
    messages: {
      english: 'Texto em inglês detectado ({{words}}): "{{text}}". Traduza para português.',
    },
  },
  create(context) {
    const report = (node, text) => {
      const words = suspects(text);
      if (words.length) {
        context.report({
          node,
          messageId: "english",
          data: { words: words.join(", "), text: text.trim().slice(0, 60) },
        });
      }
    };
    return {
      JSXText(node) {
        report(node, node.value);
      },
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (!TEXT_ATTRS.has(String(name))) return;
        const v = node.value;
        if (v && v.type === "Literal" && typeof v.value === "string") report(node, v.value);
      },
      CallExpression(node) {
        const callee = node.callee;
        const isToast =
          callee &&
          ((callee.type === "Identifier" && callee.name === "toast") ||
            (callee.type === "MemberExpression" &&
              callee.object.type === "Identifier" &&
              callee.object.name === "toast"));
        if (!isToast) return;
        const arg = node.arguments[0];
        if (arg && arg.type === "Literal" && typeof arg.value === "string") report(arg, arg.value);
      },
    };
  },
};

const useFormatUtil = {
  meta: {
    type: "problem",
    docs: { description: "Obriga o uso de src/lib/format.ts para números e datas." },
    schema: [],
    messages: {
      forbidden:
        "Use os utilitários de @/lib/format em vez de {{name}} para manter o padrão pt-BR.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (filename.includes("lib/format.ts")) return {};
    const FORBIDDEN = new Set([
      "toLocaleString",
      "toLocaleDateString",
      "toLocaleTimeString",
      "toFixed",
    ]);
    return {
      MemberExpression(node) {
        if (node.property.type !== "Identifier") return;
        if (!FORBIDDEN.has(node.property.name)) return;
        context.report({
          node,
          messageId: "forbidden",
          data: { name: node.property.name },
        });
      },
    };
  },
};

export default {
  rules: {
    "no-english-literals": noEnglishLiterals,
    "use-format-util": useFormatUtil,
  },
};
