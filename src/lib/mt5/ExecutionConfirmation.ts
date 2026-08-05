import type {
  Mt5ExecutionConfirmation,
  Mt5ExecutionOutcome,
  Mt5OrderType,
} from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

let confirmationCounter = 0;

export class ExecutionConfirmationEngine {
  private confirmations: Mt5ExecutionConfirmation[] = [];
  private maxHistory = 500;

  record(input: {
    requestId: string;
    proposalId: string;
    ticket: number | null;
    fillPrice: number | null;
    brokerMessage: string;
    status: Mt5ExecutionOutcome;
    requestedPrice: number | null;
    symbol: string;
    volume: number;
    orderType: Mt5OrderType;
    sl: number | null;
    tp: number | null;
    rejectionReason?: string | null;
    spread?: number | null;
    latencyMs?: number | null;
  }): Mt5ExecutionConfirmation {
    confirmationCounter += 1;
    const confirmation: Mt5ExecutionConfirmation = {
      id: `mt5-conf-${Date.now()}-${confirmationCounter}`,
      requestId: input.requestId,
      proposalId: input.proposalId,
      ticket: input.ticket,
      fillPrice: input.fillPrice,
      executedAt: new Date().toISOString(),
      brokerMessage: input.brokerMessage,
      status: input.status,
      slippage:
        input.fillPrice != null && input.requestedPrice != null
          ? Number((input.fillPrice - input.requestedPrice).toFixed(5))
          : null,
      rejectionReason: input.rejectionReason ?? null,
      symbol: input.symbol,
      volume: input.volume,
      orderType: input.orderType,
      requestedPrice: input.requestedPrice,
      sl: input.sl,
      tp: input.tp,
      spread: input.spread ?? null,
      latencyMs: input.latencyMs ?? null,
    };
    this.confirmations.push(confirmation);
    if (this.confirmations.length > this.maxHistory) {
      this.confirmations.splice(0, this.confirmations.length - this.maxHistory);
    }
    return { ...confirmation };
  }

  getRecent(count = 50): Mt5ExecutionConfirmation[] {
    return this.confirmations.slice(-count).reverse().map((c) => ({ ...c }));
  }

  getByProposal(proposalId: string): Mt5ExecutionConfirmation[] {
    return this.confirmations
      .filter((c) => c.proposalId === proposalId)
      .map((c) => ({ ...c }));
  }

  clear(): void {
    this.confirmations = [];
  }
}

export function getExecutionConfirmationEngine(): ExecutionConfirmationEngine {
  return getSharedSingleton("Mt5ExecutionConfirmationEngine", () => new ExecutionConfirmationEngine());
}
