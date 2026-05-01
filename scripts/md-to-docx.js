const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} = require("docx");

const inputPath = path.resolve(process.argv[2] || "JIRA_Complete_Guide_READABLE.md");
const outputPath = path.resolve(
  process.argv[3] || "JIRA_Complete_Guide_READABLE.docx"
);

function parseInlineRuns(text, size = 22) {
  const runs = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;
  let match = regex.exec(text);

  while (match) {
    if (match.index > cursor) {
      runs.push(new TextRun({ text: text.slice(cursor, match.index), size, font: "Arial" }));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          size,
          font: "Arial",
        })
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          size,
          font: "Consolas",
        })
      );
    } else {
      runs.push(new TextRun({ text: token, size, font: "Arial" }));
    }

    cursor = match.index + token.length;
    match = regex.exec(text);
  }

  if (cursor < text.length) {
    runs.push(new TextRun({ text: text.slice(cursor), size, font: "Arial" }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: "", size, font: "Arial" })];
}

function headingLevelFromDepth(depth) {
  if (depth === 1) return HeadingLevel.HEADING_1;
  if (depth === 2) return HeadingLevel.HEADING_2;
  if (depth === 3) return HeadingLevel.HEADING_3;
  if (depth === 4) return HeadingLevel.HEADING_4;
  return HeadingLevel.HEADING_5;
}

function convertMarkdownToDocx(markdown) {
  const lines = markdown.split(/\r?\n/);
  const children = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2];
      children.push(
        new Paragraph({
          heading: headingLevelFromDepth(depth),
          spacing: { before: 240, after: 120 },
          children: parseInlineRuns(text, depth <= 2 ? 32 : 26),
        })
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "BFBFBF", space: 1 },
          },
          spacing: { before: 120, after: 120 },
          children: [new TextRun("")],
        })
      );
      continue;
    }

    const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed);
    if (numberedMatch) {
      children.push(
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 60 },
          children: parseInlineRuns(numberedMatch[2], 22),
        })
      );
      continue;
    }

    const bulletMatch = /^-\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      children.push(
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 60 },
          children: parseInlineRuns(bulletMatch[1], 22),
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: parseInlineRuns(line, 22),
      })
    );
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const markdown = fs.readFileSync(inputPath, "utf8");
  const doc = convertMarkdownToDocx(markdown);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  console.log(`Created: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
