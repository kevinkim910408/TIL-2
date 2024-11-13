const fs = require("fs");
const util = require("util");
const path = require("path");

const readdir = util.promisify(fs.readdir);

const excludedFolders = [".git", ".github", "workflows"];
const excludedFiles = [
  "generate-readme.js",
  "README.md",
  "package-lock.json",
  "package.json",
];
async function countFilesAndFolders(dir) {
  const files = await readdir(dir, { withFileTypes: true });

  let fileCount = 0;
  let folderCount = 0;

  for (const file of files) {
    if (excludedFolders.includes(file.name)) {
      continue;
    }

    if (file.isDirectory()) {
      folderCount++;
      const subDir = path.join(dir, file.name);
      const subCounts = await countFilesAndFolders(subDir);
      fileCount += subCounts.fileCount;
      folderCount += subCounts.folderCount;
    } else {
      if (excludedFiles.includes(file.name)) {
        continue;
      }
      fileCount++;
    }
  }

  return { fileCount, folderCount };
}

async function countFolders(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  let folderCount = 0;

  for (const file of files) {
    if (file.isDirectory() && !excludedFolders.includes(file.name)) {
      folderCount++;
    }
  }

  return folderCount;
}

async function getFileDate(filePath) {
  const stats = await fs.promises.stat(filePath);
  return stats.birthtime.toISOString().split("T")[0];
}

async function generateTable(dir, depth = 0) {
  const files = await readdir(dir, { withFileTypes: true });

  let tableContent = "";

  if (depth !== 0) {
    tableContent += `| Date| Link | Title |\n`;
    tableContent += `|-----|------|-------|\n`;
  }

  const title = depth === 0 ? "#" : "#".repeat(depth + 2);

  for (const file of files) {
    if (file.isDirectory()) {
      if (excludedFolders.includes(file.name)) {
        continue;
      }
      const subDir = path.join(dir, file.name);
      const subTable = await generateTable(subDir, depth + 1);

      tableContent += `
${title} ${file.name}

${subTable}`;
    } else {
      if (excludedFiles.includes(file.name)) {
        continue;
      }
      const filePath = path.join(dir, file.name);
      const fileContent = await fs.promises.readFile(filePath, {
        encoding: "utf-8",
      });
      const lines = fileContent.trim().split("\n");

      const firstLine = lines[0].replace(/^#+\s*/, "").replace(/\n/g, " ");

      const fileDate = await getFileDate(filePath);

      const relativeFilePath = path
        .relative(__dirname, filePath)
        .replace(/\\/g, "/");

      tableContent += `| ${fileDate} | [👉](${relativeFilePath})| ${firstLine}\n`;
    }
  }

  return tableContent;
}

async function generateReadme() {
  const counts = await countFilesAndFolders(__dirname);
  const folderCounts = await countFolders(__dirname);
  const tableContent = await generateTable(__dirname);
  const readmeContent = `# Kevin's TIL

  I've learned ${counts.fileCount} things in ${folderCounts} categories so far!
  ${tableContent}
  `;

  fs.writeFileSync("README.md", readmeContent);
}

generateReadme().catch((error) => console.error(error));
