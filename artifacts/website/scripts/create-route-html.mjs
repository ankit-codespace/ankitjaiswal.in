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

await Promise.all(
  notepadRoutes.map(async (route) => {
    const routeDir = path.join(distRoot, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, "index.html"), notepadHtml);
  }),
);
