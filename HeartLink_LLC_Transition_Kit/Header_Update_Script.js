import fs from "fs";
import path from "path";

const baseDir = "./HeartLink_ResearchAnalyst_BaselinePack_USFDA";
const author = "Joshua Gunnels, PA-C";
const role = "Founder & Clinical Developer, HeartLink LLC";
const entity = "HeartLink LLC (Registered [Your State])";

function updateHeader(file) {
  let text = fs.readFileSync(file, "utf-8");
  if (text.includes("Independent Clinical Developer")) {
    text = text.replace(
      /Author:\s*Joshua Gunnels,.*?\n/g,
      `Author: ${author}\nRole: ${role}\nEntity: ${entity}\n`
    );
    fs.writeFileSync(file, text, "utf-8");
    console.log("✅ Updated:", file);
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp);
    else if (f.endsWith(".md")) updateHeader(fp);
  }
}

walk(baseDir);
console.log("Done updating all markdown headers.");
