import type { Mt5ExecutionGroup, Mt5ExecutionGroupStatus } from "./types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

let groupCounter = 0;

/**
 * Append-only store for institutional execution groups (OCO, bracket,
 * scale-in, scale-out, basket). Groups are never mutated in place — every
 * transition writes a fresh record and a best-effort copy to the
 * `execution_groups` Supabase table. The in-memory copy is authoritative so
 * the terminal works fully offline.
 */
export class ExecutionGroupStore {
  private groups: Mt5ExecutionGroup[] = [];
  private maxMemory = 300;

  create(input: {
    mode: Mt5ExecutionGroup["mode"];
    symbol: string;
    note?: string | null;
  }): Mt5ExecutionGroup {
    groupCounter += 1;
    const now = new Date().toISOString();
    const group: Mt5ExecutionGroup = {
      id: `GROUP-${Date.now()}-${groupCounter}`,
      mode: input.mode,
      status: "pending",
      symbol: input.symbol,
      legs: [],
      proposalIds: [],
      note: input.note ?? null,
      scaleOutLevels: [],
      scaleOutOriginalVolume: null,
      scaleOutClosedVolume: 0,
      scaleOutTicket: null,
      createdAt: now,
      updatedAt: now,
    };
    this.groups.unshift(group);
    this.prune();
    void this.persist(group);
    getMt5Logger().log(
      "execution",
      `Execution group ${group.id} created`,
      `${input.mode} · ${input.symbol}`,
      { groupId: group.id, mode: input.mode, symbol: input.symbol }
    );
    return this.clone(group);
  }

  update(id: string, mutate: (group: Mt5ExecutionGroup) => void): Mt5ExecutionGroup | null {
    const index = this.groups.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const next = this.clone(this.groups[index]);
    mutate(next);
    next.updatedAt = new Date().toISOString();
    this.groups[index] = next;
    void this.persist(next);
    return this.clone(next);
  }

  setStatus(id: string, status: Mt5ExecutionGroupStatus): Mt5ExecutionGroup | null {
    return this.update(id, (g) => {
      g.status = status;
    });
  }

  addLeg(
    id: string,
    leg: Mt5ExecutionGroup["legs"][number]
  ): Mt5ExecutionGroup | null {
    return this.update(id, (g) => {
      g.legs.push({ ...leg });
      if (leg.proposalId && !g.proposalIds.includes(leg.proposalId)) {
        g.proposalIds.push(leg.proposalId);
      }
    });
  }

  updateLeg(
    id: string,
    index: number,
    mutate: (leg: Mt5ExecutionGroup["legs"][number]) => void
  ): Mt5ExecutionGroup | null {
    return this.update(id, (g) => {
      if (g.legs[index]) mutate(g.legs[index]);
    });
  }

  get(id: string): Mt5ExecutionGroup | null {
    const g = this.groups.find((x) => x.id === id);
    return g ? this.clone(g) : null;
  }

  list(count = 100): Mt5ExecutionGroup[] {
    return this.groups.slice(0, count).map((g) => this.clone(g));
  }

  active(): Mt5ExecutionGroup[] {
    return this.groups
      .filter((g) => g.status === "pending" || g.status === "approved" || g.status === "active")
      .map((g) => this.clone(g));
  }

  clear(): void {
    this.groups = [];
  }

  private prune(): void {
    if (this.groups.length > this.maxMemory) {
      this.groups.length = this.maxMemory;
    }
  }

  private async persist(group: Mt5ExecutionGroup): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from("execution_groups").upsert(
        {
          group_id: group.id,
          mode: group.mode,
          status: group.status,
          symbol: group.symbol,
          legs_json: JSON.stringify(group.legs),
          proposal_ids: group.proposalIds,
          note: group.note,
          scale_out_levels: group.scaleOutLevels,
          scale_out_original_volume: group.scaleOutOriginalVolume,
          scale_out_closed_volume: group.scaleOutClosedVolume,
          created_at: group.createdAt,
          updated_at: group.updatedAt,
        },
        { onConflict: "group_id" }
      );
    } catch {
      /* Best effort — the in-memory store remains authoritative. */
    }
  }

  private clone(g: Mt5ExecutionGroup): Mt5ExecutionGroup {
    return {
      ...g,
      legs: g.legs.map((l) => ({ ...l })),
      proposalIds: [...g.proposalIds],
      scaleOutLevels: [...g.scaleOutLevels],
    };
  }
}

export function getExecutionGroupStore(): ExecutionGroupStore {
  return getSharedSingleton("Mt5ExecutionGroupStore", () => new ExecutionGroupStore());
}
