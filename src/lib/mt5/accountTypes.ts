/**
 * Server-side types for the MT5 Account Connection Manager (Phase 25A).
 * These describe saved accounts, connection testing and rich terminal status
 * as exposed by the Python gateway (mt5-gateway/app/account_store.py + main.py).
 *
 * SECURITY: credentials are stored encrypted in the gateway. The redacted
 * account shape below never carries a password or credential reference.
 */

export interface Mt5SavedAccount {
  id: string;
  name: string;
  broker: string;
  login: number;
  server: string | null;
  terminalPath: string | null;
  tradeMode: "manual" | "automatic" | "hedging" | "contest" | "real" | null;
  demo: boolean | null;
  favorite: boolean | null;
  isDefault: boolean | null;
  autoConnect: boolean | null;
  readOnly: boolean | null;
  remember: boolean;
  magic: number | null;
  deviation: number | null;
  hasSavedPassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt: string | null;
  lastUsedAt: string | null;
  lastLoginAt: string | null;
  lastSyncAt: string | null;
}

export interface Mt5AccountInput {
  id?: string;
  name?: string;
  broker?: string;
  login?: number | null;
  password?: string;
  investorPassword?: string;
  server?: string;
  terminalPath?: string;
  tradeMode?: string;
  demo?: boolean;
  favorite?: boolean;
  isDefault?: boolean;
  autoConnect?: boolean;
  readOnly?: boolean;
  remember?: boolean;
  magic?: number;
  deviation?: number;
}

export interface Mt5ConnectOptions {
  accountId?: string;
  login?: number | null;
  password?: string;
  investorPassword?: string;
  server?: string;
  terminalPath?: string;
  remember?: boolean;
  name?: string;
  readOnly?: boolean;
  autoConnect?: boolean;
  demo?: boolean;
  tradeMode?: string;
  magic?: number;
  deviation?: number;
}

export interface Mt5ConnectOutcome {
  ok: boolean;
  message: string | null;
  error: string | null;
  data: Record<string, unknown> | null;
}

export interface Mt5TestConnectionResult {
  ok: boolean;
  broker: string | null;
  server: string | null;
  latencyMs: number | null;
  build: number | null;
  company: string | null;
  terminalVersion: string | null;
  login: number | null;
  error: string | null;
}

export interface Mt5AccountConnectionStatus {
  connected: boolean;
  terminalConnected: boolean;
  activeAccountId: string | null;
  activeAccountName: string | null;
  login: number | null;
  server: string | null;
  brokerName: string | null;
  accountType: string | null;
  demo: boolean | null;
  demoOverride: boolean | null;
  balance: number | null;
  equity: number | null;
  margin: number | null;
  marginFree: number | null;
  leverage: number | null;
  currency: string | null;
  company: string | null;
  tradeAllowed: boolean | null;
  tradeDisabled: boolean | null;
  autoTrading: boolean | null;
  terminalVersion: string | null;
  terminalBuild: number | null;
  readOnly: boolean | null;
  autoConnect: boolean | null;
  tradeMode: string | null;
  lastConnectedAt: string | null;
  lastLoginAt: string | null;
  lastSyncAt: string | null;
}

export interface Mt5TerminalInfo {
  connected: boolean;
  terminalConnected: boolean;
  activeAccountId: string | null;
  login: number | null;
  server: string | null;
  terminalPath: string | null;
  version: string | null;
  build: number | null;
  company: string | null;
}

export interface Mt5BrokerInfo {
  brokerName: string | null;
  company: string | null;
  server: string | null;
  accountType: string | null;
  demo: boolean | null;
  terminalVersion: string | null;
  terminalBuild: number | null;
  tradeAllowed: boolean | null;
  tradeDisabled: boolean | null;
  autoTrading: boolean | null;
  login: number | null;
  accountName: string | null;
  currency: string | null;
  leverage: number | null;
  activeAccountId: string | null;
  activeAccountName: string | null;
  readOnly: boolean | null;
}

export interface Mt5AutoConnectResult {
  ok: boolean;
  connected: boolean;
  activeAccountId: string | null;
  login: number | null;
  server: string | null;
  restored: boolean;
  message: string | null;
  error: string | null;
}

export interface Mt5AccountManagerSession {
  accountId: string | null;
  login: number | null;
  server: string | null;
  brokerName: string | null;
  connected: boolean;
  connectedAt: string | null;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
}
