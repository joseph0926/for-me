// 확정한 주제의 완성작 폴더를 template에서 만든다. 사용: node scripts/new-work.ts <주제 id>
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { validateTopic, workFolder, workPackageName } from "../topic.ts";

const root = join(import.meta.dirname, "..");
const topicId = process.argv[2];
if (!topicId) throw new Error("사용: node scripts/new-work.ts <주제 id>");

const topicPath = join(root, "topics", topicId, "topic.json");
if (!existsSync(topicPath)) throw new Error(`${topicPath}가 없습니다`);
const result = validateTopic(JSON.parse(readFileSync(topicPath, "utf8")), topicId);
if (!result.ok) throw new Error(`주제 파일 오류:\n${result.errors.join("\n")}`);

const target = join(root, workFolder(topicId));
if (existsSync(target)) throw new Error(`${target}가 이미 있습니다. 기존 완성작을 덮어쓰지 않습니다`);

const skipped = new Set(["node_modules", "dist"]);
cpSync(join(root, "template"), target, { recursive: true, filter: (source) => !skipped.has(basename(source)) });

const { topic } = result;
const packagePath = join(target, "package.json");
const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
writeFileSync(packagePath, `${JSON.stringify({ ...manifest, name: workPackageName(topicId) }, null, 2)}\n`);

const htmlPath = join(target, "index.html");
const title = topic.title.replace(/[<>&]/g, "");
writeFileSync(htmlPath, readFileSync(htmlPath, "utf8").replace(/<title>.*<\/title>/, `<title>${title}</title>`));

writeFileSync(
  join(target, "src", "platform.ts"),
  `// 주제 ${topicId}의 platform\nexport const platform: "web" | "app" = "${topic.platform}";\n`,
);

console.log(`${workFolder(topicId)}를 만들었습니다. apps/today-ref에서 pnpm install 후 pnpm --filter ${workPackageName(topicId)} dev`);
