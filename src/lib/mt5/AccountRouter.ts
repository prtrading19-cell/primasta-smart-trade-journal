import type { Mt5AccountDescriptor, Mt5PlaceRequest, Mt5VenueId } from "./types";
import { getMt5Config } from "./config";
import { getMt5Gateway } from "./Mt5Gateway";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export interface Mt5AccountRoutingResult {
  accountId: string;
  venueId: Mt5VenueId;
  accepted: boolean;
  message: string;
  error: string | null;
}

/**
 * Multi-account trading architecture (feature F).
 *
 * The current implementation is single-account (the Python MT5 gateway's
 * active session), but every execution path routes through this interface so
 * that account-level routing for multiple terminals can be added later
 * without redesigning the engine. The gateway transport already reports an
 * `activeAccountId`; this router simply resolves it.
 */
export interface Mt5AccountRouter {
  readonly id: string;
  listAccounts(): Mt5AccountDescriptor[];
  getActiveAccount(): Mt5AccountDescriptor | null;
  routeOrder(request: Mt5PlaceRequest): Promise<Mt5AccountRoutingResult>;
}

export class SingleAccountRouter implements Mt5AccountRouter {
  readonly id = "single";

  listAccounts(): Mt5AccountDescriptor[] {
    const cfg = getMt5Config();
    const gateway = getMt5Gateway();
    const activeId = gateway.getActiveAccountId();
    const login = activeId != null ? Number(activeId) : cfg.login;
    const accountId = login != null ? String(login) : "unavailable";
    return [
      {
        accountId,
        label: cfg.brokerName || "MetaTrader 5",
        venueId: "mt5-python",
        isActive: true,
        login,
        server: cfg.server,
      },
    ];
  }

  getActiveAccount(): Mt5AccountDescriptor | null {
    return this.listAccounts().find((a) => a.isActive) ?? null;
  }

  async routeOrder(request: Mt5PlaceRequest): Promise<Mt5AccountRoutingResult> {
    const account = this.getActiveAccount();
    if (!account || account.accountId === "unavailable") {
      return {
        accountId: "unavailable",
        venueId: "mt5-python",
        accepted: false,
        message: "No active MT5 account — order not routed",
        error: "No active MT5 account",
      };
    }
    return {
      accountId: account.accountId,
      venueId: "mt5-python",
      accepted: true,
      message: `Routed to account ${account.accountId} via ${account.label}`,
      error: null,
    };
  }
}

export function getMt5AccountRouter(): Mt5AccountRouter {
  return getSharedSingleton("Mt5AccountRouter", () => new SingleAccountRouter());
}
