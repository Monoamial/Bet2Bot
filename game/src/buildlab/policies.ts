import {
  clone, defaultStrategy, presetPreflop, TIER_ORDER,
  type Action, type Strategy,
} from "../strategy/model.ts";

export const BUILD_LAB_PRESETS = [
  { id: "starter", label: "Starter — play every hand" },
  { id: "tight", label: "Tight preflop" },
  { id: "loose", label: "Loose preflop" },
  { id: "caller", label: "Caller — calls down" },
  { id: "folder", label: "Folder — gives up to bets" },
  { id: "value", label: "Value — raises made pairs+" },
] as const;

export type BuildLabPresetId = (typeof BUILD_LAB_PRESETS)[number]["id"];
export type BuildLabBotPreset = BuildLabPresetId | "custom";
export type BuildLabSlot = "a" | "b";

export interface BuildLabBotState {
  preset: BuildLabBotPreset;
  strategy: Strategy;
}

export interface BuildLabStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const POSTFLOP_STREETS = ["flop", "turn", "river"] as const;
const BUILD_LAB_STORAGE_KEYS: Record<BuildLabSlot, string> = {
  a: "b2b.buildLab.botA.v1",
  b: "b2b.buildLab.botB.v1",
};
const ACTIONS: Action[] = ["fold", "check", "call", "raise"];
const RAISE_SIZES = ["small", "pot", "overbet"];
const TIERS = ["monster", "twoPairPlus", "pair", "nothing"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf(value: unknown, options: readonly string[]): boolean {
  return typeof value === "string" && options.includes(value);
}

function fillPreflop(strategy: Strategy, action: Action) {
  for (const handClass of Object.keys(strategy.preflop)) strategy.preflop[handClass] = action;
}

/** Fresh copies of the existing simple policy styles, expressed in Builder data. */
export function createBuildLabPreset(preset: BuildLabPresetId): Strategy {
  const strategy = defaultStrategy();

  switch (preset) {
    case "starter":
      break;
    case "tight":
      strategy.preflop = presetPreflop("tight");
      break;
    case "loose":
      strategy.preflop = presetPreflop("loose");
      break;
    case "caller":
      fillPreflop(strategy, "call");
      for (const street of POSTFLOP_STREETS) {
        for (const tier of TIER_ORDER) {
          strategy[street].table[tier] = { first: "check", facing: "call" };
        }
      }
      break;
    case "folder":
      fillPreflop(strategy, "fold");
      for (const street of POSTFLOP_STREETS) {
        for (const tier of TIER_ORDER) {
          strategy[street].table[tier] = { first: "check", facing: "fold" };
        }
      }
      break;
    case "value":
      fillPreflop(strategy, "call");
      for (const street of POSTFLOP_STREETS) {
        for (const tier of TIER_ORDER) {
          strategy[street].table[tier] = tier === "nothing"
            ? { first: "check", facing: "call" }
            : { first: "raise", facing: "raise" };
        }
      }
      break;
  }

  return strategy;
}

export function createBuildLabBot(preset: BuildLabPresetId): BuildLabBotState {
  return { preset, strategy: createBuildLabPreset(preset) };
}

function browserStorage(): BuildLabStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; }
  catch { return null; }
}

function isMixedAction(value: unknown): boolean {
  return isRecord(value)
    && isOneOf(value.action, ACTIONS)
    && typeof value.frequency === "number"
    && Number.isFinite(value.frequency)
    && value.frequency >= 0
    && value.frequency <= 100
    && (value.raiseSize === undefined || isOneOf(value.raiseSize, RAISE_SIZES));
}

function isStrategy(value: unknown): value is Strategy {
  if (!isRecord(value) || !isRecord(value.preflop)) return false;
  if (Object.values(value.preflop).some((action) => !isOneOf(action, ACTIONS))) return false;
  if (value.preflopRaiseSize !== undefined && !isOneOf(value.preflopRaiseSize, RAISE_SIZES)) return false;

  for (const street of POSTFLOP_STREETS) {
    const policy = value[street];
    if (!isRecord(policy) || !isRecord(policy.table)) return false;
    for (const tier of TIERS) {
      const entry = policy.table[tier];
      if (!isRecord(entry) || !isOneOf(entry.first, ACTIONS) || !isOneOf(entry.facing, ACTIONS)) return false;
      if (entry.firstRaiseSize !== undefined && !isOneOf(entry.firstRaiseSize, RAISE_SIZES)) return false;
      if (entry.facingRaiseSize !== undefined && !isOneOf(entry.facingRaiseSize, RAISE_SIZES)) return false;
      if (entry.firstMix !== undefined && !isMixedAction(entry.firstMix)) return false;
      if (entry.facingMix !== undefined && !isMixedAction(entry.facingMix)) return false;
    }
    if (policy.advanced !== undefined) {
      if (!Array.isArray(policy.advanced)) return false;
      for (const rule of policy.advanced) {
        if (!isRecord(rule) || !isOneOf(rule.tier, TIERS) || !isOneOf(rule.action, ACTIONS)) return false;
        if (rule.position !== undefined && !isOneOf(rule.position, ["ip", "oop"])) return false;
        if (rule.oppType !== undefined && !isOneOf(rule.oppType, ["loose", "tight"])) return false;
        if (rule.potOdds !== undefined && !isOneOf(rule.potOdds, ["cheap", "expensive"])) return false;
        if (rule.raiseSize !== undefined && !isOneOf(rule.raiseSize, RAISE_SIZES)) return false;
        if (rule.mix !== undefined && !isMixedAction(rule.mix)) return false;
      }
    }
  }

  return true;
}

function isBuildLabBot(value: unknown): value is BuildLabBotState {
  return isRecord(value)
    && (value.preset === "custom" || BUILD_LAB_PRESETS.some((preset) => preset.id === value.preset))
    && isStrategy(value.strategy);
}

export function loadBuildLabBot(
  slot: BuildLabSlot,
  fallbackPreset: BuildLabPresetId,
  storage: BuildLabStorage | null = browserStorage(),
): BuildLabBotState {
  const fallback = () => createBuildLabBot(fallbackPreset);
  if (!storage) return fallback();
  try {
    const saved = storage.getItem(BUILD_LAB_STORAGE_KEYS[slot]);
    if (!saved) return fallback();
    const value: unknown = JSON.parse(saved);
    return isBuildLabBot(value)
      ? { preset: value.preset, strategy: clone(value.strategy) }
      : fallback();
  } catch {
    return fallback();
  }
}

export function saveBuildLabBot(
  slot: BuildLabSlot,
  bot: BuildLabBotState,
  storage: BuildLabStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try { storage.setItem(BUILD_LAB_STORAGE_KEYS[slot], JSON.stringify(bot)); }
  catch { /* Private browsing/storage limits should not block the lab. */ }
}

export function buildLabPresetLabel(preset: BuildLabBotPreset): string {
  return preset === "custom"
    ? "Custom (edited)"
    : BUILD_LAB_PRESETS.find((item) => item.id === preset)?.label ?? "Custom (edited)";
}
