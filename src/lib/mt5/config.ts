import type { Mt5RedactedConfig, Mt5SafetyConfig } from "./types";

export interface Mt5Config {
  enabled: boolean;
  login: number | null;
  password: string | null;
  investorPassword: string | null;
  server: string | null;
  brokerName: string;
  terminalPath: string | null;
  gatewayTransport: "unavailable" | "bridge" | "python" | "windows" | "docker";
  gatewayUrl: string | null;
  magic: number;
  defaultDeviation: number;
  safety: Mt5SafetyConfig;
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numList(value: string | undefined, fallback: number[]): number[] {
  if (!value) return fallback;
  const parsed = value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v));
  return parsed.length > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

/**
 * Server-side MT5 configuration.
 * Reads credentials exclusively from process.env. Never expose the returned
 * object to the client — use `redactMt5Config()` for any public surface.
 */
export function getMt5Config(): Mt5Config {
  const loginRaw = process.env.MT5_LOGIN?.trim();
  const login = loginRaw && /^\d+$/.test(loginRaw) ? Number(loginRaw) : null;

  const gatewayTransportRaw = (process.env.MT5_GATEWAY_TRANSPORT ?? "unavailable").toLowerCase();
  const gatewayTransport: Mt5Config["gatewayTransport"] =
    gatewayTransportRaw === "bridge" ||
    gatewayTransportRaw === "python" ||
    gatewayTransportRaw === "windows" ||
    gatewayTransportRaw === "docker"
      ? gatewayTransportRaw
      : "unavailable";

  return {
    enabled: bool(process.env.MT5_ENABLED, false),
    login,
    password: process.env.MT5_PASSWORD?.trim() || null,
    investorPassword: process.env.MT5_INVESTOR_PASSWORD?.trim() || null,
    server: process.env.MT5_SERVER?.trim() || null,
    brokerName: process.env.MT5_BROKER_NAME?.trim() || "MetaTrader 5",
    terminalPath: process.env.MT5_TERMINAL_PATH?.trim() || null,
    gatewayTransport,
    gatewayUrl: process.env.MT5_GATEWAY_URL?.trim() || null,
    magic: num(process.env.MT5_MAGIC, 190624),
    defaultDeviation: num(process.env.MT5_DEVIATION, 20),
    safety: {
      maxRiskPerTradePercent: num(process.env.MT5_SAFETY_MAX_RISK_PERCENT, 2),
      maxLotsPerOrder: num(process.env.MT5_SAFETY_MAX_LOTS, 10),
      maxDailyLossPercent: num(process.env.MT5_SAFETY_MAX_DAILY_LOSS_PERCENT, 5),
      maxDailyTrades: num(process.env.MT5_SAFETY_MAX_DAILY_TRADES, 10),
      maxDrawdownPercent: num(process.env.MT5_SAFETY_MAX_DRAWDOWN_PERCENT, 20),
      minFreeMarginRequired: num(process.env.MT5_SAFETY_MIN_FREE_MARGIN, 1000),
      tradingDays: numList(process.env.MT5_SAFETY_TRADING_DAYS, [1, 2, 3, 4, 5]),
      tradingOpenHour: num(process.env.MT5_SAFETY_TRADING_OPEN_HOUR, 0),
      tradingCloseHour: num(process.env.MT5_SAFETY_TRADING_CLOSE_HOUR, 24),
      emergencyKillSwitch: bool(process.env.MT5_SAFETY_KILL_SWITCH, false),
    },
  };
}

export function hasMt5Credentials(): boolean {
  const cfg = getMt5Config();
  return cfg.login != null && (cfg.password != null || cfg.investorPassword != null);
}

export function maskLogin(login: number | null): string {
  if (login == null) return "—";
  const s = String(login);
  if (s.length <= 2) return "••";
  return `${s.slice(0, 1)}${"•".repeat(Math.max(3, s.length - 2))}${s.slice(-1)}`;
}

/**
 * Redacted configuration safe for client-facing status payloads.
 * Never includes login, password, or investor password values.
 */
export function redactMt5Config(cfg: Mt5Config = getMt5Config()): Mt5RedactedConfig {
  return {
    enabled: cfg.enabled,
    loginMasked: maskLogin(cfg.login),
    hasPassword: cfg.password != null,
    hasInvestorPassword: cfg.investorPassword != null,
    server: cfg.server,
    brokerName: cfg.brokerName,
    terminalPath: cfg.terminalPath,
    gatewayTransport: cfg.gatewayTransport,
    gatewayUrl: cfg.gatewayUrl,
    magic: cfg.magic,
    defaultDeviation: cfg.defaultDeviation,
    safety: { ...cfg.safety },
  };
}

export const MT5_BROKER_ID = "mt5";
export const MT5_BROKER_NAME = "MetaTrader 5";
