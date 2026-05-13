import type { Context } from ".keystone/types";
import { permissions } from "../access";

interface CreateWaitlistEntryArgs {
  customerName: string;
  phoneNumber: string;
  partySize: number;
  quotedWaitTime?: number | null;
  notes?: string | null;
}

interface UpdateWaitlistStatusArgs {
  entryId: string;
  action: "notify" | "seat" | "cancel" | "no_show";
  tableId?: string | null;
}

interface WaitlistMutationResult {
  success: boolean;
  error: string | null;
}

function normalizePartySize(value: unknown) {
  return Math.max(1, Math.floor(Number(value || 1)));
}

function normalizeQuotedWait(value: unknown) {
  return Math.max(0, Math.floor(Number(value || 15)));
}

export async function createWaitlistEntry(
  root: any,
  args: CreateWaitlistEntryArgs,
  context: Context
): Promise<WaitlistMutationResult> {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized to manage waitlist" };
  }

  const customerName = args.customerName?.trim();
  const phoneNumber = args.phoneNumber?.trim();
  if (!customerName) return { success: false, error: "Guest name is required" };
  if (!phoneNumber) return { success: false, error: "Phone number is required" };

  try {
    await context.sudo().db.WaitlistEntry.createOne({
      data: {
        customerName,
        phoneNumber,
        partySize: normalizePartySize(args.partySize),
        quotedWaitTime: normalizeQuotedWait(args.quotedWaitTime),
        notes: args.notes?.trim() || "",
        status: "waiting",
        addedBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : undefined,
      },
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateWaitlistStatus(
  root: any,
  args: UpdateWaitlistStatusArgs,
  context: Context
): Promise<WaitlistMutationResult> {
  if (!permissions.canManageKitchen({ session: context.session })) {
    return { success: false, error: "Not authorized to manage waitlist" };
  }

  if (!args.entryId) return { success: false, error: "Waitlist entry is required" };

  try {
    const sudo = context.sudo();
    const entry = await sudo.query.WaitlistEntry.findOne({
      where: { id: args.entryId },
      query: "id status partySize customerName",
    });

    if (!entry) return { success: false, error: "Waitlist entry not found" };
    if (["seated", "cancelled", "no_show"].includes(entry.status || "")) {
      return { success: false, error: "This waitlist entry is already closed" };
    }

    const now = new Date().toISOString();

    if (args.action === "notify") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "notified", notifiedAt: now },
      });
    } else if (args.action === "seat") {
      if (!args.tableId) return { success: false, error: "Select a table before seating the guest" };

      const table = await sudo.query.Table.findOne({
        where: { id: args.tableId },
        query: "id tableNumber capacity status",
      });

      if (!table) return { success: false, error: "Table not found" };
      if (table.status !== "available") {
        return { success: false, error: `Table ${table.tableNumber || ""} is not available` };
      }
      if (Number(table.capacity || 0) < Number(entry.partySize || 1)) {
        return { success: false, error: "Selected table is too small for this party" };
      }

      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: {
          status: "seated",
          seatedAt: now,
          table: { connect: { id: args.tableId } },
        },
      });

      await sudo.db.Table.updateOne({
        where: { id: args.tableId },
        data: { status: "occupied" },
      });
    } else if (args.action === "cancel") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "cancelled" },
      });
    } else if (args.action === "no_show") {
      await sudo.db.WaitlistEntry.updateOne({
        where: { id: args.entryId },
        data: { status: "no_show" },
      });
    } else {
      return { success: false, error: "Invalid waitlist action" };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
