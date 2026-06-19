import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const distRoot = path.join(siteRoot, "dist", "public");
const indexPath = path.join(distRoot, "index.html");

const notepadRoutes = [
  "online-notepad",
  "notepad",
  "text-to-pdf",
  "online-text-editor",
  path.join("tools", "notepad"),
];

const generalRoutes = [
  "work",
  "about",
  "contact",
  "tools",
  path.join("tools", "webp-converter"),
  path.join("tools", "png-to-webp"),
  path.join("tools", "jpg-to-webp"),
  path.join("tools", "image-to-webp"),
  "png-to-webp",
  path.join("tools", "clipboard-history"),
  path.join("tools", "clipboard-history-saver"),
  path.join("tools", "clipboard-manager"),
  path.join("tools", "snippet-manager"),
  "clipboard-history",
  path.join("tools", "paste-to-download-image"),
  path.join("tools", "paste-to-image"),
  path.join("tools", "screenshot-editor"),
  path.join("tools", "clipboard-to-image"),
  "paste-to-image",
  path.join("tools", "domain-age-checker"),
  path.join("tools", "domain-age"),
  path.join("tools", "whois-lookup"),
  path.join("tools", "how-old-is-this-domain"),
  "domain-age-checker",
  path.join("tools", "yt-thumbnail-downloader"),
  path.join("tools", "youtube-thumbnail-downloader"),
  path.join("tools", "youtube-thumbnail-grabber"),
  path.join("tools", "yt-thumbnail"),
  "youtube-thumbnail-downloader",
  path.join("tools", "pomodoro"),
  path.join("tools", "pomodoro-timer"),
  path.join("tools", "focus-timer"),
  path.join("tools", "study-timer"),
  "pomodoro",
];

const notepadFavicon = "/icons/ilovenotepad_logo_premium.png?v=3";
const faviconLinks = [
  `<link data-rh="true" rel="icon" href="${notepadFavicon}" type="image/png" />`,
  `<link data-rh="true" rel="apple-touch-icon" href="${notepadFavicon}" />`,
].join("\n    ");

const faviconBlockPattern =
  /    <link data-rh="true" rel="icon" href="\/favicon\.ico" sizes="any" \/>\r?\n    <link data-rh="true" rel="icon" href="\/favicon\.svg" type="image\/svg\+xml" \/>\r?\n    <link data-rh="true" rel="icon" type="image\/webp" href="\/favicon\.webp" \/>\r?\n    <link data-rh="true" rel="apple-touch-icon" href="\/apple-touch-icon\.png" \/>/;

const indexHtml = await readFile(indexPath, "utf8");
const notepadHtml = indexHtml.replace(faviconBlockPattern, `    ${faviconLinks}`);

if (notepadHtml === indexHtml) {
  throw new Error("Could not replace favicon links in dist/public/index.html");
}

await Promise.all([
  ...notepadRoutes.map(async (route) => {
    const routeDir = path.join(distRoot, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, "index.html"), notepadHtml);
  }),
  ...generalRoutes.map(async (route) => {
    const routeDir = path.join(distRoot, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, "index.html"), indexHtml);
  }),
]);
