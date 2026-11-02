import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("generates the real dashboard route tree before production bundling from a clean external checkout", () => {
  const project = process.cwd();
  const checkout = mkdtempSync(join(tmpdir(), "maatlaadu-routes-"));
  try {
    cpSync(join(project, "src"), join(checkout, "src"), { recursive: true });
    rmSync(join(checkout, "src/routeTree.gen.ts"));
    for (const file of ["vite.config.ts", "tsconfig.json", "package.json"]) {
      cpSync(join(project, file), join(checkout, file));
    }
    symlinkSync(join(project, "node_modules"), join(checkout, "node_modules"), "dir");
    const env: Record<string, string | undefined> = { ...process.env, TSR_TMP_DIR: join(project, ".tanstack/tmp") };
    delete env['LOVABLE_SANDBOX'];
    delete env['DEV_SERVER__PROJECT_PATH'];
    // Resolving build configuration executes the awaited production generator
    // hook, without bundling or relying on the preview's existing generated tree.
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { resolveConfig } from 'vite';
      const root = ${JSON.stringify(checkout)};
      const config = await resolveConfig({ root, configFile: root + '/vite.config.ts' }, 'build');
      console.log('GENERATOR_COUNT=' + config.plugins.filter(p => p.name === 'tanstack:router-generator').length);
    `], { cwd: project, env, encoding: "utf8", timeout: 60000 });
    expect(output).toContain("GENERATOR_COUNT=1");
    const tree = readFileSync(join(checkout, "src/routeTree.gen.ts"), "utf8");
    for (const route of ["__root", "index", "auth", "reset-password", "users", "user.$userId", "learning", "practice", "translations", "content", "activity", "health", "settings"]) {
      expect(tree).toContain(`./routes/${route}`);
    }
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}, 90000);