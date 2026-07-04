import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

interface PackageJson {
  main?: string;
  types?: string;
  exports?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function readPackageJson(): Promise<PackageJson> {
  const packageJsonPath = join(process.cwd(), "package.json");

  return JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
}

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listSourceFiles(entryPath);
      }

      if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return nestedFiles.flat();
}

test("Node type definitions are installed for production dependency builds", async () => {
  const packageJson = await readPackageJson();

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
  const packageJson = await readPackageJson();

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

test("package entrypoints resolve to built JavaScript and declarations", async () => {
  const packageJson = await readPackageJson();

  assert.equal(
    packageJson.main,
    "./dist/index.js",
    "Node runtime must import the built ESM entrypoint instead of TypeScript source",
  );
  assert.equal(
    packageJson.types,
    "./dist/index.d.ts",
    "TypeScript consumers should read built declaration files that match the runtime entrypoint",
  );
  assert.equal(
    packageJson.exports?.["."],
    "./dist/index.js",
    "workspace consumers such as api must resolve @repo/hydrology-engine to dist, not src/index.ts",
  );
});

test("source ESM relative imports and exports include .js specifiers for Node-resolvable dist output", async () => {
  const sourceFiles = await listSourceFiles(join(process.cwd(), "src"));
  const extensionlessRelativeSpecifiers: string[] = [];

  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, "utf8");
    const matches = source.matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g);

    for (const match of matches) {
      const specifier = match[1];

      if (specifier === undefined) {
        continue;
      }

      if (!specifier.endsWith(".js")) {
        extensionlessRelativeSpecifiers.push(`${sourceFile}: ${specifier}`);
      }
    }
  }

  assert.deepEqual(
    extensionlessRelativeSpecifiers,
    [],
    "tsc preserves ESM specifiers, so relative source imports and exports must use .js extensions for Node runtime resolution",
  );
});

test("built package entrypoint exists before runtime consumers import it", async () => {
  const distFiles = await readdir(join(process.cwd(), "dist"));

  assert.ok(
    distFiles.includes("index.js"),
    "hydrology-engine build must emit dist/index.js for package exports",
  );
  assert.ok(
    distFiles.includes("index.d.ts"),
    "hydrology-engine build must emit dist/index.d.ts for package types",
  );
});
