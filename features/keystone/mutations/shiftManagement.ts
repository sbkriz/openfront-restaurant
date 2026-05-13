import type { Context } from ".keystone/types";
import { permissions } from "../access";

interface UpsertShiftArgs {
  shiftId?: string | null;
  staffId?: string | null;
  role: string;
  startTime: string;
  endTime: string;
  hourlyRate?: string | null;
}

interface UpdateShiftStatusArgs {
  shiftId: string;
  action: "cancel" | "no_show" | "start" | "complete";
}

interface ShiftMutationResult {
  success: boolean;
  error: string | null;
}

const VALID_ROLES = ["server", "bartender", "host", "busser", "cook", "dishwasher", "manager"];
const OPEN_SHIFT_STATUSES = ["scheduled", "started"];

function parseShiftWindow(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime())) throw new Error("Shift start time is invalid");
  if (Number.isNaN(end.getTime())) throw new Error("Shift end time is invalid");
  if (end <= start) throw new Error("Shift end time must be after start time");
  return { start, end };
}

async function assertNoStaffOverlap({
  staffId,
  startTime,
  endTime,
  shiftId,
  context,
}: {
  staffId?: string | null;
  startTime: string;
  endTime: string;
  shiftId?: string | null;
  context: Context;
}) {
  if (!staffId) return;
  const { start, end } = parseShiftWindow(startTime, endTime);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const shifts = await context.sudo().query.Shift.findMany({
    where: {
      staff: { id: { equals: staffId } },
      startTime: { gte: dayStart.toISOString(), lte: dayEnd.toISOString() },
      status: { in: OPEN_SHIFT_STATUSES },
    },
    query: "id startTime endTime status",
  });

  const overlapping = shifts.filter((shift: any) => {
    if (shiftId && shift.id === shiftId) return false;
    const existingStart = new Date(shift.startTime);
    const existingEnd = new Date(shift.endTime);
    return existingStart < end && start < existingEnd;
  });

  if (overlapping.length > 0) {
    throw new Error("This staff member already has an overlapping open shift");
  }
}

export async function upsertShift(
  root: any,
  args: UpsertShiftArgs,
  context: Context
): Promise<ShiftMutationResult> {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage shifts" };
  }

  if (!VALID_ROLES.includes(args.role)) return { success: false, error: "Invalid shift role" };

  try {
    parseShiftWindow(args.startTime, args.endTime);

    if (args.staffId) {
      const staff = await context.sudo().query.User.findOne({
        where: { id: args.staffId },
        query: "id name isActive",
      });
      if (!staff) return { success: false, error: "Staff member not found" };
      if (staff.isActive === false) return { success: false, error: "Cannot schedule an inactive staff member" };
    }

    await assertNoStaffOverlap({
      staffId: args.staffId,
      startTime: args.startTime,
      endTime: args.endTime,
      shiftId: args.shiftId,
      context,
    });

    const data: any = {
      startTime: new Date(args.startTime).toISOString(),
      endTime: new Date(args.endTime).toISOString(),
      role: args.role,
      hourlyRate: args.hourlyRate || undefined,
      staff: args.staffId ? { connect: { id: args.staffId } } : { disconnect: true },
    };

    if (args.shiftId) {
      await context.sudo().db.Shift.updateOne({ where: { id: args.shiftId }, data });
    } else {
      await context.sudo().db.Shift.createOne({ data: { ...data, status: "scheduled" } });
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateShiftStatus(
  root: any,
  args: UpdateShiftStatusArgs,
  context: Context
): Promise<ShiftMutationResult> {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage shifts" };
  }

  if (!args.shiftId) return { success: false, error: "Shift is required" };

  try {
    const sudo = context.sudo();
    const shift = await sudo.query.Shift.findOne({
      where: { id: args.shiftId },
      query: "id status clockIn clockOut",
    });
    if (!shift) return { success: false, error: "Shift not found" };

    const now = new Date().toISOString();
    if (args.action === "start") {
      if (shift.status !== "scheduled") return { success: false, error: "Only scheduled shifts can be started" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "started", clockIn: now } });
    } else if (args.action === "complete") {
      if (shift.status !== "started") return { success: false, error: "Only started shifts can be completed" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "completed", clockOut: now } });
    } else if (args.action === "no_show") {
      if (shift.status !== "scheduled") return { success: false, error: "Only scheduled shifts can be marked no-show" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "no_show" } });
    } else if (args.action === "cancel") {
      if (!["scheduled", "started"].includes(shift.status || "")) return { success: false, error: "This shift is already closed" };
      await sudo.db.Shift.updateOne({ where: { id: args.shiftId }, data: { status: "called_out" } });
    } else {
      return { success: false, error: "Invalid shift action" };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
