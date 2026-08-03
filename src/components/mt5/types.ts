import type {
  Mt5AccountInfo,
  Mt5BrokerStatus,
  Mt5ConnectionState,
  Mt5Deal,
  Mt5ExecutionConfirmation,
  Mt5HealthRecord,
  Mt5LogEntry,
  Mt5Order,
  Mt5Position,
  Mt5RedactedConfig,
  Mt5TradeProposal,
} from "@/lib/mt5/types";

export interface Mt5Overview {
  generatedAt: string;
  status: Mt5BrokerStatus;
  config: Mt5RedactedConfig;
  connection: Mt5ConnectionState;
  health: Mt5HealthRecord;
  account: {
    latest: Mt5AccountInfo | null;
    history: Mt5AccountInfo[];
    lastSyncAt: string | null;
    lastSyncStatus: "success" | "failed" | "unavailable" | "never";
    error: string | null;
    floatingPnl: number | null;
    closedPnl: number | null;
    syncCount: number;
  };
  positions: {
    positions: Mt5Position[];
    pendingOrders: Mt5Order[];
    closedOrders: Mt5Order[];
    deals: Mt5Deal[];
    lastSyncAt: string | null;
    lastSyncStatus: "success" | "failed" | "unavailable" | "never";
    error: string | null;
    syncCount: number;
    openCount: number;
    pendingCount: number;
    magicNumbers: number[];
  };
  proposals: Mt5TradeProposal[];
  confirmations: Mt5ExecutionConfirmation[];
  logs: Mt5LogEntry[];
  dailyTrades: number;
}

export interface Mt5ActionResponse {
  ok: boolean;
  message?: string;
  error?: string;
  action?: string;
  proposal?: Mt5TradeProposal | null;
  confirmation?: Mt5ExecutionConfirmation | null;
}

export interface Mt5ApprovalRequest {
  proposalId: string;
  action: "approve" | "reject";
  note?: string;
}
