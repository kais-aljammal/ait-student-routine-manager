const fs = require('fs');
const path = require('path');

const files = [
  "app/dashboard/constraints/onboarding-flow.tsx",
  "app/dashboard/constraints/page.tsx",
  "lib/schedule/precompute.ts",
  "app/api/generate-schedule/route.ts",
  "lib/schedule/prompt.ts"
];

const archiveDir = path.join(__dirname, 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

const archiveFile = path.join(archiveDir, 'deleted-code-2026-04-30.txt');
let content = "ARCHIVED - INACTIVE - NON-FUNCTIONAL - DO NOT IMPORT OR EXECUTE\n\n";

const timestamp = new Date().toISOString();

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    content += `/* --- FILE: ${file} --- TIMESTAMP: ${timestamp} --- */\n`;
    content += fs.readFileSync(filePath, 'utf8');
    content += "\n\n";
  }
}

fs.writeFileSync(archiveFile, content);
console.log("Archive created at", archiveFile);
