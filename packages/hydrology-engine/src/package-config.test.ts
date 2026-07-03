import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

test("Node type definitions are installed for production dependency builds", async () => {
  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8"),
  ) as PackageJson;

  assert.equal(
    packageJson.dependencies?.["@types/node"],
    "^20.11.24",
    "hydrology-engine tsconfig requires Node types during Render's dependency build, so @types/node must be installed outside devDependencies",
  );
  assert.equal(
    packageJson.devDependencies?.["@types/node"],
    undefined,
    "@types/node should not be dev-only for packages built as production dependencies",
  );
});

test("Postgres type definitions are installed for production dependency builds", async () => {
  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8"),
  ) as PackageJson;

  assert.equal(
    packageJson.dependencies?.["@types/pg"],
    "^8.11.2",
    "hydrology-engine imports pg types during Render's dependency build, so @types/pg must be installed outside devDependencies",
  );
  assert.equal(
    packageJson.devDependencies?.["@types/pg"],
    undefined,
    "@types/pg should not be dev-only for packages built as production dependencies",
  );
});
