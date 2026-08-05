import type {
  Mt5PlaceRequest,
  Mt5VenueDescriptor,
  Mt5VenueId,
  Mt5VenueRoutingResult,
  Mt5VenueStatus,
} from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

/**
 * FIX-ready execution venue contract (feature J).
 *
 * The institutional engine routes through this interface, never a concrete
 * broker API. Future adapters for LMAX, PrimeXM, OneZero, Interactive
 * Brokers and DXTrade implement `submit`/`cancel`/`modify` against the FIX
 * 4.4 order semantics already used by the MT5 path — the engine does not
 * change. Only the venue with status "active" receives live orders.
 */
export interface Mt5ExecutionVenue {
  readonly id: Mt5VenueId;
  readonly name: string;
  readonly protocol: "MT5" | "FIX" | "REST" | "native";
  getStatus(): Mt5VenueStatus;
  submit(request: Mt5PlaceRequest): Promise<Mt5VenueRoutingResult>;
  cancel(orderId: string, symbol: string): Promise<Mt5VenueRoutingResult>;
  modify(orderId: string, changes: { sl?: number | null; tp?: number | null; price?: number | null }): Promise<Mt5VenueRoutingResult>;
  health(): Promise<{ ok: boolean; latencyMs: number | null; error: string | null }>;
}

class PlaceholderVenue implements Mt5ExecutionVenue {
  constructor(
    readonly id: Mt5VenueId,
    readonly name: string,
    readonly protocol: Mt5ExecutionVenue["protocol"]
  ) {}

  getStatus(): Mt5VenueStatus {
    return "available";
  }

  async submit(): Promise<Mt5VenueRoutingResult> {
    return {
      venueId: this.id,
      accepted: false,
      orderId: null,
      message: `${this.name} adapter is not configured — engine is FIX-ready but no live FIX session exists`,
      error: "Venue not configured",
    };
  }

  async cancel(): Promise<Mt5VenueRoutingResult> {
    return { venueId: this.id, accepted: false, orderId: null, message: `${this.name} adapter not configured`, error: "Venue not configured" };
  }

  async modify(): Promise<Mt5VenueRoutingResult> {
    return { venueId: this.id, accepted: false, orderId: null, message: `${this.name} adapter not configured`, error: "Venue not configured" };
  }

  async health(): Promise<{ ok: boolean; latencyMs: number | null; error: string | null }> {
    return { ok: false, latencyMs: null, error: `${this.name} adapter not configured` };
  }
}

export class Mt5VenueRegistry {
  private venues = new Map<Mt5VenueId, Mt5ExecutionVenue>();

  register(venue: Mt5ExecutionVenue): void {
    this.venues.set(venue.id, venue);
  }

  get(id: Mt5VenueId): Mt5ExecutionVenue | undefined {
    return this.venues.get(id);
  }

  list(): Mt5VenueDescriptor[] {
    return [...this.venues.values()].map((v) => ({
      id: v.id,
      name: v.name,
      protocol: v.protocol,
      status: v.getStatus(),
      description: this.descriptionOf(v),
    }));
  }

  getActiveVenue(): Mt5ExecutionVenue | null {
    for (const v of this.venues.values()) {
      if (v.getStatus() === "active") return v;
    }
    return null;
  }

  private descriptionOf(v: Mt5ExecutionVenue): string {
    switch (v.id) {
      case "mt5-python":
        return "The existing live Python MT5 gateway. All orders route here while this venue is active.";
      case "lmax":
        return "LMAX FIX adapter — future execution venue, engine-ready (no live session configured).";
      case "primexm":
        return "PrimeXM FIX adapter — future execution venue, engine-ready (no live session configured).";
      case "onezero":
        return "OneZero Hub adapter — future execution venue, engine-ready (no live session configured).";
      case "interactive-brokers":
        return "Interactive Brokers adapter — future execution venue, engine-ready (no live session configured).";
      case "dxtrade":
        return "DXTrade adapter — future execution venue, engine-ready (no live session configured).";
    }
  }
}

export function getMt5VenueRegistry(): Mt5VenueRegistry {
  const registry = getSharedSingleton("Mt5VenueRegistry", () => {
    const r = new Mt5VenueRegistry();
    r.register(new PlaceholderVenue("mt5-python", "MetaTrader 5 (Python Gateway)", "MT5"));
    r.register(new PlaceholderVenue("lmax", "LMAX", "FIX"));
    r.register(new PlaceholderVenue("primexm", "PrimeXM", "FIX"));
    r.register(new PlaceholderVenue("onezero", "OneZero", "FIX"));
    r.register(new PlaceholderVenue("interactive-brokers", "Interactive Brokers", "native"));
    r.register(new PlaceholderVenue("dxtrade", "DXTrade", "REST"));
    return r;
  });
  return registry;
}
