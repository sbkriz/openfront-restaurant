import type { Context } from ".keystone/types";
import { permissions } from "../access";

interface UpsertReservationArgs {
  reservationId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  reservationDate: string;
  partySize: number;
  duration?: number | null;
  status?: string | null;
  specialRequests?: string | null;
  assignedTableId?: string | null;
}

interface UpdateReservationStatusArgs {
  reservationId: string;
  action: "pending" | "confirm" | "seat" | "complete" | "cancel" | "no_show";
  tableId?: string | null;
}

interface ReservationMutationResult {
  success: boolean;
  error: string | null;
}

const ACTIVE_RESERVATION_STATUSES = ["pending", "confirmed", "seated"];
const TERMINAL_RESERVATION_STATUSES = ["completed", "cancelled", "no_show"];

function minutes(value: unknown, fallback = 90) {
  return Math.max(15, Math.floor(Number(value || fallback)));
}

function partySize(value: unknown) {
  return Math.max(1, Math.floor(Number(value || 1)));
}

function reservationWindow(dateValue: string, duration: number) {
  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) throw new Error("Reservation date is invalid");
  const end = new Date(start.getTime() + duration * 60_000);
  return { start, end };
}

async function assertTableAssignable({
  tableId,
  party,
  reservationStart,
  duration,
  reservationId,
  context,
}: {
  tableId?: string | null;
  party: number;
  reservationStart: string;
  duration: number;
  reservationId?: string | null;
  context: Context;
}) {
  if (!tableId) return;

  const sudo = context.sudo();
  const table = await sudo.query.Table.findOne({
    where: { id: tableId },
    query: "id tableNumber capacity status",
  });

  if (!table) throw new Error("Assigned table not found");
  if (Number(table.capacity || 0) < party) {
    throw new Error(`Table ${table.tableNumber || ""} is too small for this party`);
  }

  const { start, end } = reservationWindow(reservationStart, duration);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const sameDayReservations = await sudo.query.Reservation.findMany({
    where: {
      assignedTable: { id: { equals: tableId } },
      reservationDate: { gte: dayStart.toISOString(), lte: dayEnd.toISOString() },
      status: { in: ACTIVE_RESERVATION_STATUSES },
    },
    query: "id reservationDate duration status customerName",
  });

  const conflicts = sameDayReservations.filter((reservation: any) => {
    if (reservationId && reservation.id === reservationId) return false;
    const existingStart = new Date(reservation.reservationDate);
    const existingEnd = new Date(existingStart.getTime() + minutes(reservation.duration) * 60_000);
    return existingStart < end && start < existingEnd;
  });

  if (conflicts.length > 0) {
    throw new Error(`Table ${table.tableNumber || ""} already has a reservation in that time window`);
  }
}

export async function upsertReservation(
  root: any,
  args: UpsertReservationArgs,
  context: Context
): Promise<ReservationMutationResult> {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized to manage reservations" };
  }

  const customerName = args.customerName?.trim();
  const customerPhone = args.customerPhone?.trim();
  if (!customerName) return { success: false, error: "Customer name is required" };
  if (!customerPhone) return { success: false, error: "Phone number is required" };

  try {
    const normalizedPartySize = partySize(args.partySize);
    const normalizedDuration = minutes(args.duration);
    const status = args.status || "confirmed";

    if (!["pending", "confirmed", "seated", "completed", "cancelled", "no_show"].includes(status)) {
      return { success: false, error: "Invalid reservation status" };
    }

    await assertTableAssignable({
      tableId: args.assignedTableId,
      party: normalizedPartySize,
      reservationStart: args.reservationDate,
      duration: normalizedDuration,
      reservationId: args.reservationId,
      context,
    });

    const data: any = {
      customerName,
      customerPhone,
      customerEmail: args.customerEmail?.trim() || "",
      reservationDate: new Date(args.reservationDate).toISOString(),
      partySize: normalizedPartySize,
      duration: normalizedDuration,
      status,
      specialRequests: args.specialRequests?.trim() || "",
    };

    if (args.assignedTableId) {
      data.assignedTable = { connect: { id: args.assignedTableId } };
    } else if (args.reservationId) {
      data.assignedTable = { disconnect: true };
    }

    if (args.reservationId) {
      await context.sudo().db.Reservation.updateOne({
        where: { id: args.reservationId },
        data,
      });
    } else {
      await context.sudo().db.Reservation.createOne({ data });
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateReservationStatus(
  root: any,
  args: UpdateReservationStatusArgs,
  context: Context
): Promise<ReservationMutationResult> {
  if (!permissions.canManageTables({ session: context.session })) {
    return { success: false, error: "Not authorized to manage reservations" };
  }

  if (!args.reservationId) return { success: false, error: "Reservation is required" };

  try {
    const sudo = context.sudo();
    const reservation = await sudo.query.Reservation.findOne({
      where: { id: args.reservationId },
      query: "id status partySize duration reservationDate assignedTable { id tableNumber status }",
    });

    if (!reservation) return { success: false, error: "Reservation not found" };
    if (TERMINAL_RESERVATION_STATUSES.includes(reservation.status || "")) {
      return { success: false, error: "This reservation is already closed" };
    }

    if (args.action === "pending") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "pending" } });
    } else if (args.action === "confirm") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "confirmed" } });
    } else if (args.action === "seat") {
      const tableId = args.tableId || reservation.assignedTable?.id;
      if (!tableId) return { success: false, error: "Assign a table before seating" };

      await assertTableAssignable({
        tableId,
        party: partySize(reservation.partySize),
        reservationStart: reservation.reservationDate,
        duration: minutes(reservation.duration),
        reservationId: reservation.id,
        context,
      });

      const table = await sudo.query.Table.findOne({ where: { id: tableId }, query: "id status tableNumber" });
      if (!table) return { success: false, error: "Table not found" };
      if (!["available", "reserved"].includes(table.status || "")) {
        return { success: false, error: `Table ${table.tableNumber || ""} is not available to seat` };
      }

      await sudo.db.Reservation.updateOne({
        where: { id: args.reservationId },
        data: {
          status: "seated",
          assignedTable: { connect: { id: tableId } },
        },
      });
      await sudo.db.Table.updateOne({ where: { id: tableId }, data: { status: "occupied" } });
    } else if (args.action === "complete") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "completed" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "occupied") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "cleaning" } });
      }
    } else if (args.action === "cancel") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "cancelled" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "reserved") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "available" } });
      }
    } else if (args.action === "no_show") {
      await sudo.db.Reservation.updateOne({ where: { id: args.reservationId }, data: { status: "no_show" } });
      if (reservation.assignedTable?.id && reservation.assignedTable.status === "reserved") {
        await sudo.db.Table.updateOne({ where: { id: reservation.assignedTable.id }, data: { status: "available" } });
      }
    } else {
      return { success: false, error: "Invalid reservation action" };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
