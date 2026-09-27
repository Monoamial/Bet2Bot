import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Import the real TSX mode configuration through esbuild so this focused test can
// assert the presets without pulling JSX or browser state into Node's test runner.
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/components/GameModes.tsx", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  jsx: "automatic",
  write: false,
});
const bundleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`;
const { HEADS_UP_STACK_PRESETS, MODES } = await import(bundleUrl);

const getMode = (key) => MODES.find((mode) => mode.key === key);

test("heads-up No-Limit and Pot-Limit offer short and standard refill stacks", () => {
  assert.deepEqual(HEADS_UP_STACK_PRESETS.map(({ key, chips, bigBlinds }) => ({ key, chips, bigBlinds })), [
    { key: "short", chips: 40, bigBlinds: 20 },
    { key: "standard", chips: 200, bigBlinds: 100 },
  ]);

  for (const key of ["nl", "pl"]) {
    const mode = getMode(key);
    assert.ok(mode, `${key} mode exists`);
    assert.equal(mode.stack, 200, "100 BB remains the default");
    assert.deepEqual(mode.stackPresets, HEADS_UP_STACK_PRESETS);
    assert.equal(mode.carry, undefined, "refill modes do not carry stacks");
    assert.match(mode.intro, /both stacks reset/i);
  }
});

test("Survival remains a single carried human stack, not an elimination mode", () => {
  const survival = getMode("survival");
  assert.ok(survival);
  assert.equal(survival.stack, 100);
  assert.equal(survival.carry, true);
  assert.equal(survival.stackPresets, undefined);
  assert.equal(MODES.some((mode) => mode.key === "elimination" || /elimination/i.test(mode.title)), false);
});
