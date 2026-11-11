// Builds thanos-pitch.pptx from the content in thanos-pitch.md.
// Usage: cd pitch && npm install && node build_deck.js
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("./apply_theme.js");

const THEME = {
  name: "Thanos Codename",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B1F2A", lt1: "FFFFFF", dk2: "2D3142", lt2: "EEF1F5",
    accent1: "E07A1F", // amber: Gloves / connections (the motif)
    accent2: "2A7F7F", // teal: pull / healthy path
    accent3: "6B4E9B", // violet: push
    accent4: "5B6575", // slate gray: muted text
    accent5: "C9D2DC", // light steel: neutral fills
    accent6: "8C3B4A", // berry: risks / gaps
    hlink: "2A7F7F", folHlink: "6B4E9B",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "Thanos (codename) pitch";
pres.author = "Thanos founding team";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const SH = pres.shapes;

// ---------- layouts ----------
const FOOTER = "Thanos is a working name  ·  Planning draft, October 2026  ·  Hypotheses are labeled";
pres.defineSlideMaster({
  title: "DARK",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.5, w: 9.5, h: 2.8, fontFace: THEME.headFontFace, fontSize: 40, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 3.45, w: 9.5, h: 0.9, fontSize: 18, color: C.accent5, valign: "top", align: "left" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontFace: THEME.headFontFace, fontSize: 34, bold: true, color: C.text2, valign: "middle", align: "left" }, text: "" } },
    { text: { text: FOOTER, options: { x: 0.6, y: 7.0, w: 10, h: 0.3, fontSize: 10, color: C.accent4, isTextBox: true } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.accent4, align: "right" },
});

// ---------- motif helpers: nodes joined by amber Gloves ----------
let objCount = 0;
const nm = (p) => `${p}-${++objCount}`;

function node(slide, x, y, w, h, label, sub, opts = {}) {
  slide.addText(
    [
      { text: label, options: { bold: true, fontSize: opts.size || 16, color: opts.dark ? C.background1 : C.text2, breakLine: !!sub } },
      ...(sub ? [{ text: sub, options: { fontSize: opts.subSize || 12, color: opts.dark ? C.accent5 : C.accent4 } }] : []),
    ],
    {
      shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.12, x, y, w, h, align: "center", valign: "middle", isTextBox: true,
      fill: { color: opts.fill || (opts.dark ? C.text2 : C.background2) },
      line: { color: opts.border || C.accent5, width: 1 },
      shadow: { type: "outer", blur: 4, offset: 1.5, angle: 90, opacity: 0.18, color: "000000" },
      objectName: nm("node"),
    }
  );
}

// Horizontal glove from x1 to x2 at y; dir "right" or "left" decides the arrowhead end.
function glove(slide, x1, x2, y, label, opts = {}) {
  const left = Math.min(x1, x2), w = Math.abs(x2 - x1);
  slide.addShape(SH.LINE, {
    x: left, y, w, h: 0,
    line: { color: opts.color || C.accent1, width: opts.width || 3,
      ...(opts.dir === "left" ? { beginArrowType: "triangle" } : { endArrowType: "triangle" }) },
    objectName: nm("glove"),
  });
  if (label) {
    slide.addText(label, { x: left, y: y - 0.6, w, h: 0.55, fontSize: opts.labelSize || 12, bold: true, valign: "bottom",
      color: opts.labelColor || C.accent1, align: "center", isTextBox: true, margin: 0, objectName: nm("glove-label") });
  }
}

function chip(slide, x, y, w, text, fill, color) {
  slide.addText(text, { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y, w, h: 0.34, fontSize: 11, bold: true, align: "center", valign: "middle",
    fill: { color: fill }, color: color || C.background1, isTextBox: true, margin: 0, objectName: nm("chip") });
}

function numberDot(slide, x, y, n, fill) {
  slide.addText(String(n), { shape: SH.OVAL, x, y, w: 0.5, h: 0.5, fontSize: 16, bold: true, align: "center", valign: "middle",
    fill: { color: fill || C.accent1 }, color: C.background1, isTextBox: true, margin: 0, objectName: nm("dot") });
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill || C.background2 }, line: { color: C.accent5, width: 0.75 }, objectName: nm("card") });
}

function body(slide, x, y, w, h, runs, opts = {}) {
  slide.addText(runs, { x, y, w, h, fontSize: opts.size || 14, color: opts.color || C.text2, valign: opts.valign || "top", isTextBox: true,
    paraSpaceAfter: opts.space ?? 6, margin: opts.margin ?? 0.05, objectName: nm("text"), ...(opts.extra || {}) });
}

const bullets = (items, size = 14) => items.map((t, i) => ({ text: t, options: { bullet: true, fontSize: size, breakLine: i < items.length - 1 } }));

// ======================= SLIDES =======================

// 1. Title
pres.addSection({ title: "Opening" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Opening" });
s.addText("Compose, connect and deploy technology stacks, visually, into infrastructure you own", { placeholder: "title" });
s.addText("Thanos (codename)  ·  For design partners, collaborators and investors  ·  Oct 2026", { placeholder: "body" });
node(s, 0.7, 5.3, 2.4, 1.0, "orders-db", "PostgreSQL", { dark: true });
node(s, 3.9, 5.3, 2.4, 1.0, "orders-api", "your service", { dark: true });
node(s, 7.1, 5.3, 2.4, 1.0, "events", "Kafka", { dark: true });
node(s, 10.3, 5.3, 2.4, 1.0, "archive", "S3 bucket", { dark: true });
glove(s, 3.1, 3.9, 5.8, null);
glove(s, 6.3, 7.1, 5.8, null);
glove(s, 9.5, 10.3, 5.8, null);
s.addText("Technologies joined by Gloves: typed, validated, deployable connections", { x: 0.7, y: 6.5, w: 12, h: 0.4, fontSize: 14, color: C.accent1, isTextBox: true, margin: 0 });
s.addNotes("Thanos is a control plane. You draw a stack, connect the parts with typed connections we call Gloves, and deploy it into your own OpenShift cluster. It then tells you whether each part and each connection actually works. 'Thanos' is a working name; we will rename before launch.");

// 2. Problem
pres.addSection({ title: "Problem and alternatives" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Problem and alternatives" });
s.addText("Stack wiring is manual, repeated and fragile", { placeholder: "title" });
const steps = [
  ["Read operator docs", "Write custom resources for each database, broker and connector"],
  ["Hunt for wiring", "Service names, ports, generated secret names, injected by hand"],
  ["Pick connectors", "License-check and configure e.g. Kafka → S3, DLQ, images"],
  ["Repeat", "Per team and per environment, with slightly different settings"],
  ["Debug the links", "When it breaks: which connection failed, and why?"],
];
steps.forEach(([h, d], i) => {
  const x = 0.6 + i * 2.48;
  card(s, x, 1.6, 2.28, 2.65);
  numberDot(s, x + 0.2, 1.8, i + 1);
  body(s, x + 0.15, 2.45, 2.0, 2.2, [
    { text: h, options: { bold: true, fontSize: 16, breakLine: true } },
    { text: d, options: { fontSize: 13, color: C.accent4 } },
  ]);
  if (i < steps.length - 1) glove(s, x + 2.28, x + 2.48, 2.9, null, { width: 2 });
});
card(s, 0.6, 4.75, 12.1, 1.4, C.background2);
body(s, 0.9, 4.9, 9.2, 1.1, [
  { text: "The glue between components is where the time goes, and nobody owns it.", options: { italic: true, fontSize: 20, bold: true, color: C.text2 } },
], { valign: "middle" });
chip(s, 10.4, 5.28, 2.0, "HYPOTHESIS", C.accent3);
s.addNotes("This is our hypothesis of the pain for platform and data teams on OpenShift. We have not yet completed interviews; validating this is our first milestone (12 discovery interviews, at least 3 design partners).");

// 3. Alternatives
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Problem and alternatives" });
s.addText("Today's tools each solve part of it", { placeholder: "title" });
const alts = [
  ["Helm / YAML + GitOps", "Argo CD, OpenShift GitOps", "Reliable delivery of known manifests", "You still hand-write the wiring between technologies"],
  ["Developer portals", "Backstage, Red Hat Developer Hub", "Templates, catalog, self-service", "Scaffolding, not validated connections or runtime status"],
  ["Platform orchestrators", "Humanitec, Massdriver", "Resource graphs, cloud IaC", "Mostly cloud-IaC centric; not data stacks on your OpenShift"],
  ["Data / flow tools", "NiFi, Airbyte, Kafka Connect", "Moving data between systems", "Run pipelines; don't deploy and wire the systems themselves"],
];
alts.forEach(([name, ex, good, gap], i) => {
  const x = 0.6 + i * 3.06;
  card(s, x, 1.55, 2.86, 4.95, C.background2);
  body(s, x + 0.2, 1.7, 2.5, 1.0, [
    { text: name, options: { bold: true, fontSize: 18, breakLine: true } },
    { text: ex, options: { fontSize: 12, color: C.accent4 } },
  ]);
  chip(s, x + 0.2, 2.85, 1.3, "GOOD AT", C.accent2);
  body(s, x + 0.2, 3.3, 2.5, 1.1, good, { size: 14 });
  chip(s, x + 0.2, 4.4, 1.3, "GAP", C.accent6);
  body(s, x + 0.2, 4.85, 2.5, 1.5, gap, { size: 14 });
});
s.addNotes("Massdriver is the closest: a visual canvas over IaC modules. None of the tools we surveyed combines validated cross-technology connections with deployment into the customer's own OpenShift. That is a statement about our search, not proof that nothing exists.");

// 4. Solution
pres.addSection({ title: "Product" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Product" });
s.addText("One loop: design, connect, validate, deploy, observe", { placeholder: "title" });
const loop = [
  ["Design", "Drag technologies from a curated catalog; forms come from each package's schema"],
  ["Connect", "Gloves compute compatibility from declared capabilities"],
  ["Validate", "Schema, semantic and cluster preflight checks with plain-language reasons"],
  ["Deploy", "A reviewed plan, executed by an agent inside your cluster"],
  ["Observe", "Health per technology and per connection, plus drift"],
];
loop.forEach(([h, d], i) => {
  const x = 0.6 + i * 2.45;
  s.addText(h, { shape: SH.CHEVRON, x, y: 1.7, w: 2.45, h: 1.0, fill: { color: i === 1 ? C.accent1 : C.text2 }, color: C.background1,
    fontSize: 18, bold: true, align: "center", valign: "middle", isTextBox: true, objectName: nm("chevron") });
  body(s, x + 0.15, 2.95, 2.15, 1.9, d, { size: 14 });
});
card(s, 0.6, 5.0, 12.1, 1.5, C.background2);
body(s, 0.9, 5.15, 11.5, 1.2, [
  { text: "Everything is versioned, declarative YAML. ", options: { bold: true, fontSize: 16 } },
  { text: "Diff it, export it, review it like code. Thanos never stores your secret values; projects reference Kubernetes Secrets by name.", options: { fontSize: 16 } },
], { valign: "middle" });
s.addNotes("Everything is stored as versioned, declarative YAML so it can be diffed, exported and reviewed like code. The canvas is a view of that document, not a separate source of truth.");

// 5. Product experience
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Product" });
s.addText("What a user sees: the reference pipeline", { placeholder: "title" });
s.addShape(SH.ROUNDED_RECTANGLE, { x: 0.6, y: 1.45, w: 12.1, h: 3.25, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 }, objectName: "canvas" });
node(s, 0.85, 2.5, 1.9, 1.05, "orders-db", "PostgreSQL");
node(s, 4.1, 2.5, 1.9, 1.05, "orders-api", "your service");
node(s, 7.35, 2.5, 1.9, 1.05, "events", "Kafka");
node(s, 10.6, 2.5, 1.9, 1.05, "archive", "S3 (external)");
glove(s, 2.75, 4.1, 3.02, null);
glove(s, 6.0, 7.35, 3.02, null);
glove(s, 9.25, 10.6, 3.02, null);
chip(s, 2.2, 3.85, 2.45, "pull · pgwire/3 · config only", C.accent2);
chip(s, 5.45, 3.85, 2.45, "push · kafka/3 · topic created", C.accent3);
chip(s, 8.7, 3.85, 2.45, "auto · adapter deployed", C.accent1);
body(s, 0.9, 1.6, 11.5, 0.6, "Draw it, and Thanos resolves each connection and its runtime path:", { size: 14, color: C.accent4 });
card(s, 0.6, 4.95, 7.4, 1.6, C.background1);
body(s, 0.8, 5.05, 7.1, 1.45, [
  { text: "events → archive: ", options: { bold: true, fontSize: 15, color: C.accent1 } },
  { text: "Kafka must be read (pull) and the bucket must be written to (push). Neither side moves data, so a direct link is impossible. Thanos adds the Kafka→S3 sink adapter and explains why.", options: { fontSize: 15 } },
], { valign: "middle" });
const states = ["configured", "deployed", "ready", "flowing"];
body(s, 8.3, 4.95, 4.4, 0.4, "Status per connection", { size: 13, color: C.accent4 });
states.forEach((t, i) => chip(s, 8.3 + i * 1.12, 5.4, 1.02, t, i === 3 ? C.accent2 : C.text2));
body(s, 8.3, 5.85, 4.4, 0.7, "\"Flowing\" is shown only when a data signal exists; otherwise \"not observable\".", { size: 12, color: C.accent4 });
s.addNotes("This is the reference MVP pipeline. The key moment is the third connection: instead of failing at runtime, Thanos explains why a direct link is impossible and inserts the right adapter. The fourth status, flowing, is only claimed with evidence.");

// 6. Architecture
pres.addSection({ title: "Architecture and differentiation" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Architecture and differentiation" });
s.addText("Your cluster, your secrets", { placeholder: "title" });
card(s, 0.6, 1.5, 4.5, 3.9, C.background2);
body(s, 0.85, 1.6, 4.0, 0.5, "Thanos control plane", { size: 17, extra: { bold: true } });
["UI & API", "Catalog & capability registry", "Resolver & planner", "Deployment records & audit"].forEach((t, i) =>
  node(s, 0.9, 2.2 + i * 0.78, 3.9, 0.62, t, null, { size: 14, fill: C.background1 }));
card(s, 6.3, 1.5, 6.4, 3.9, C.background2);
body(s, 6.55, 1.6, 6.0, 0.5, "Your OpenShift cluster", { size: 17, extra: { bold: true } });
node(s, 6.6, 2.2, 2.6, 1.0, "Thanos Agent", "namespaced RBAC", { dark: true });
node(s, 9.75, 2.2, 2.65, 1.0, "Your operators", "CloudNativePG, Strimzi");
node(s, 6.6, 3.95, 2.6, 1.0, "Deployers", "for external APIs");
node(s, 9.75, 3.95, 2.65, 1.0, "Workloads", "& adapters");
glove(s, 5.1, 6.6, 2.7, "outbound HTTPS only", { dir: "left", labelSize: 11 });
glove(s, 9.2, 9.75, 2.7, null, { width: 2 });
glove(s, 9.2, 9.75, 4.45, null, { width: 2, color: C.accent4 });
card(s, 0.6, 5.65, 12.1, 1.05, C.background1);
body(s, 0.85, 5.72, 11.6, 0.9, [
  { text: "Never leaves your environment: ", options: { bold: true, fontSize: 15, color: C.accent6 } },
  { text: "secret values · application data · message payloads · logs (streamed only on request, never stored)", options: { fontSize: 15 } },
], { valign: "middle" });
s.addNotes("No inbound firewall rules and no central kubeconfigs. The operators you already trust do the heavy lifting; Thanos orchestrates and observes. The agent needs only a namespaced role, never cluster-admin.");

// 7. Differentiation / Gloves
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Architecture and differentiation" });
s.addText("Gloves: connections that know what they are", { placeholder: "title" });
const q = [
  [0, 0, "Output · pull", "provider: \"read me\"", C.accent2],
  [1, 0, "Output · push", "emitter: \"I send\"", C.accent3],
  [0, 1, "Input · pull", "consumer: \"I read\"", C.accent2],
  [1, 1, "Input · push", "receiver: \"send to me\"", C.accent3],
];
q.forEach(([cx, cy, h, d, col]) =>
  s.addText([{ text: h, options: { bold: true, fontSize: 16, breakLine: true } }, { text: d, options: { fontSize: 13 } }],
    { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.1, x: 0.6 + cx * 2.75, y: 1.55 + cy * 1.45, w: 2.6, h: 1.3, align: "center", valign: "middle",
      fill: { color: col }, color: C.background1, isTextBox: true, objectName: nm("port") }));
card(s, 0.6, 4.6, 5.35, 1.6, C.background2);
body(s, 0.8, 4.7, 5.0, 1.45, [
  { text: "A Glove joins an output to an input.", options: { bold: true, fontSize: 15, breakLine: true } },
  { text: "Same initiation → connect directly. Pull-out to push-in → Thanos inserts an active adapter. Every \"no\" comes with a reason.", options: { fontSize: 14 } },
]);
const diffs = [
  ["Matching on protocols, not product names", "One new technology connects to everything that speaks its protocols, and one adapter bridges whole protocol families"],
  ["Logical link ≠ runtime path", "Config-only, provisioned resource, or deployed adapter. The plan shows exactly what will run."],
  ["Pluggable deployers", "Operators and containers are declarative packages; external services use a small HTTP protocol. No core changes."],
];
diffs.forEach(([h, d], i) => {
  numberDot(s, 6.4, 1.6 + i * 1.65, i + 1);
  body(s, 7.05, 1.52 + i * 1.65, 5.65, 1.55, [
    { text: h, options: { bold: true, fontSize: 17, breakLine: true } },
    { text: d, options: { fontSize: 14, color: C.accent4 } },
  ]);
});
s.addNotes("Most integration tools grow by pairwise connectors; our work grows with the number of protocols. Honest limit: the MVP checks that the pipes fit, not that record schemas match. Schema compatibility comes later.");

// 8. Market
pres.addSection({ title: "Market and model" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Market and model" });
s.addText("Initial market: platform teams on OpenShift", { placeholder: "title" });
body(s, 0.6, 1.55, 6.9, 4.9, [
  { text: "Who", options: { bold: true, fontSize: 18, breakLine: true } },
  ...bullets(["Platform and data-platform teams in enterprises already running Red Hat OpenShift",
    "They repeatedly provision \"service + Postgres + Kafka + object storage\" stacks for internal teams"], 15),
  { text: " ", options: { fontSize: 8, breakLine: true } },
  { text: "Why them first", options: { bold: true, fontSize: 18, breakLine: true } },
  ...bullets(["Infrastructure ownership and security constraints are strongest here, and our design turns them into a feature",
    "A standardized substrate (OpenShift, operators) narrows the compatibility surface"], 15),
], { space: 4 });
card(s, 8.0, 1.55, 4.7, 4.9, C.text1);
body(s, 8.3, 1.75, 4.1, 1.4, "$1.9B", { size: 66, color: C.accent1, extra: { bold: true, fontFace: THEME.headFontFace } });
body(s, 8.3, 3.15, 4.1, 1.2, "OpenShift annual recurring revenue, growing >30% (IBM, Q4 2025 earnings call)", { size: 15, color: C.background1 });
body(s, 8.3, 4.45, 4.1, 1.85, "That is the platform's size, not our market. We have no defensible TAM yet: bottom-up sizing will come from design-partner data.", { size: 13, color: C.accent5, extra: { italic: true } });
s.addNotes("We deliberately do not show a TAM number because we could not find one we would defend. The IBM figure shows the installed base is large and growing; our addressable slice is unknown until design partners tell us how many teams and environments they run.");

// 9. Business model
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Market and model" });
s.addText("Business model: hypotheses to test", { placeholder: "title" });
const bm = [
  ["Per managed environment", "Subscription per cluster namespace that Thanos manages, tiered by catalog and policy features"],
  ["Self-hosted license", "Enterprise license for regulated customers that run the control plane themselves"],
  ["Certified packages", "Certified technology packages and partner catalogs, once the catalog has an ecosystem (later)"],
];
bm.forEach(([h, d], i) => {
  const x = 0.6 + i * 4.1;
  card(s, x, 1.6, 3.85, 3.2, C.background2);
  chip(s, x + 0.25, 1.85, 1.6, "HYPOTHESIS", C.accent3);
  body(s, x + 0.25, 2.45, 3.35, 2.25, [
    { text: h, options: { bold: true, fontSize: 20, breakLine: true } },
    { text: d, options: { fontSize: 15, color: C.accent4 } },
  ], { space: 10 });
});
body(s, 0.6, 5.1, 12.1, 0.6, "No pricing has been validated. Each hypothesis is tested in design-partner conversations before any commitment.", { size: 14, color: C.accent4, extra: { italic: true } });
s.addNotes("These are plausible ways to capture value, labeled as hypotheses. We will test willingness to pay and the unit of value (environment, team, or stack) with design partners.");

// 10. Roadmap
pres.addSection({ title: "Plan and ask" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Plan and ask" });
s.addText("Roadmap: validate first, then build to a pilot", { placeholder: "title" });
s.addShape(SH.LINE, { x: 1.0, y: 3.6, w: 11.3, h: 0, line: { color: C.accent1, width: 4 }, objectName: "timeline" });
const ms = [
  ["Weeks 1–4", "Discovery interviews + 6 proof-of-concept experiments → go/no‑go decision"],
  ["~Week 10", "Design loop: canvas → validation → versioned YAML"],
  ["~Week 13", "First real deployment into an OpenShift cluster via the agent"],
  ["~Week 21", "MVP: 4 technologies, Kafka→S3 adapter, status and recovery"],
  ["~Week 24", "Pilot-ready with design partners"],
  ["Later", "GitOps export, managed operators, more packages, stream processing"],
];
ms.forEach(([w, d], i) => {
  const x = 1.5 + i * 2.05;
  s.addShape(SH.OVAL, { x: x - 0.17, y: 3.43, w: 0.34, h: 0.34, fill: { color: i === 5 ? C.accent5 : C.text2 }, line: { color: C.background1, width: 2 }, objectName: nm("milestone") });
  const up = i % 2 === 0;
  body(s, x - 0.95, up ? 1.55 : 4.0, 1.9, 1.8, [
    { text: w, options: { bold: true, fontSize: 16, color: C.accent1, breakLine: true } },
    { text: d, options: { fontSize: 13 } },
  ], { valign: up ? "bottom" : "top", extra: { align: "center" } });
});
card(s, 0.6, 6.0, 12.1, 0.75, C.background2);
body(s, 0.85, 6.05, 11.6, 0.65, "Three engineers using AI coding agents. Base case ~24 weeks to pilot; range ~18–36 weeks, depending on proof-of-concept outcomes.", { size: 14, valign: "middle" });
s.addNotes("Estimates assume three senior engineers and a modest net AI speed-up on well-bounded tasks. Go/no-go gates at weeks 4, 13 and 21; the scope-cut order is defined in advance.");

// 11. Risks & defensibility
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Plan and ask" });
s.addText("Risks we take seriously, and why we can win", { placeholder: "title" });
const rows = [
  ["Teams may be \"fine\" with Helm + GitOps", "Capability model and explanations are hard to bolt onto delivery tools; we export to GitOps instead of fighting it"],
  ["Security approval of an in-cluster agent", "Trust by design: outbound-only, namespaced, no secret values stored"],
  ["Operator heterogeneity (readiness, drift)", "The package catalog and adapters compound into an asset over time"],
  ["The platform vendor could extend its console", "Integrate with Developer Hub; focus on cross-technology semantics"],
  ["Name and trademark conflict", "Rename before any public launch"],
];
chip(s, 0.6, 1.5, 2.3, "RISK", C.accent6);
chip(s, 6.8, 1.5, 2.3, "OUR ANSWER", C.accent2);
rows.forEach(([r, a], i) => {
  const y = 2.0 + i * 0.95;
  card(s, 0.6, y, 5.9, 0.82, C.background2);
  body(s, 0.8, y, 5.6, 0.82, r, { size: 14, valign: "middle", extra: { bold: true } });
  glove(s, 6.5, 6.8, y + 0.41, null, { width: 2 });
  card(s, 6.8, y, 5.9, 0.82, C.background1);
  body(s, 7.0, y, 5.6, 0.82, a, { size: 13, valign: "middle" });
});
s.addNotes("The hardest technical risks are drift noise with operator webhooks, adapter reliability and coordinator robustness. Each has a time-boxed proof of concept in the first four weeks.");

// 12. Ask
s = pres.addSlide({ masterName: "DARK", sectionTitle: "Plan and ask" });
s.addText("Become a design partner", { placeholder: "title" });
node(s, 0.7, 0.6, 2.6, 0.85, "Your team", null, { dark: true, size: 15 });
node(s, 4.1, 0.6, 2.6, 0.85, "Discovery call", null, { dark: true, size: 15 });
node(s, 7.5, 0.6, 2.6, 0.85, "Pilot in your cluster", null, { dark: true, size: 15 });
glove(s, 3.3, 4.1, 1.025, null);
glove(s, 6.7, 7.5, 1.025, null);
s.addText("We're looking for 3 OpenShift platform or data teams with a recurring stack-provisioning need", { placeholder: "body" });
const ask = [
  ["You get", ["Early access", "Input into the catalog", "A pilot in your own cluster"]],
  ["We ask for", ["A 45-minute discovery interview", "A security review of the agent design", "A sandbox namespace for a pilot"]],
  ["Investors & collaborators", ["Introductions to these teams", "Feedback on the trust model"]],
];
ask.forEach(([h, items], i) => {
  const x = 0.7 + i * 4.1;
  s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 4.5, w: 3.85, h: 2.3, rectRadius: 0.1, fill: { color: C.text2 }, line: { color: C.accent1, width: 1.5 }, objectName: nm("ask-card") });
  body(s, x + 0.25, 4.6, 3.4, 2.1, [
    { text: h, options: { bold: true, fontSize: 18, color: C.accent1, breakLine: true } },
    ...bullets(items, 15).map((r) => ({ ...r, options: { ...r.options, color: C.background1 } })),
  ], { space: 4 });
});
s.addNotes("Close with the concrete next step: a discovery interview within two weeks. We are not claiming traction; we are asking for the conversations that will validate or kill the hypothesis.");

(async () => {
  await pres.writeFile({ fileName: "thanos-pitch.pptx" });
  await applyTheme("thanos-pitch.pptx", THEME);
  console.log("wrote thanos-pitch.pptx");
})();
