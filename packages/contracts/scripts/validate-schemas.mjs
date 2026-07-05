import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const schemaDir = join(process.cwd(), "schemas");
const files = readdirSync(schemaDir).filter((name) => name.endsWith(".schema.json"));

for (const file of files) {
  const raw = readFileSync(join(schemaDir, file), "utf8");
  const schema = JSON.parse(raw);
  ajv.addSchema(schema);
  if (schema.$id?.startsWith("https://golden-boilerplate.dev/contracts/")) {
    ajv.addSchema(schema, `https://golden-boilerplate.dev/contracts/${file}`);
  }
}

for (const schemaKey of Object.keys(ajv.schemas)) {
  ajv.getSchema(schemaKey);
}

console.log(`Validated ${files.length} JSON Schema contract(s).`);
