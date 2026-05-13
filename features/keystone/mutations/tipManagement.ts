import type { Context } from ".keystone/types";
import { permissions } from "../access";

interface CreateTipPoolArgs {
  date: string;
  tipPoolType: "individual" | "pool_by_role" | "house_pool";
  cashTips: string;
  creditTips: string;
}

interface UpdateTipPoolStatusArgs {
  tipPoolId: string;
  action: "distribute" | "reopen";
}

interface TipPoolMutationResult {
  success: boolean;
  error: string | null;
}

const ROLE_PERCENTAGES: Record<string, number> = {
  server: 60,
  bartender: 20,
  busser: 10,
  host: 10,
};

function dollarsToCents(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}

function getBusinessDayWindow(date: string) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) throw new Error("Business date is invalid");
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function calculateHours(entry: any) {
  if (typeof entry.hoursWorked === "number") return entry.hoursWorked;
  if (!entry.clockIn || !entry.clockOut) return 0;
  const start = new Date(entry.clockIn);
  const end = new Date(entry.clockOut);
  return Math.max(0, Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 100) / 100);
}

async function calculateDistributions({
  tipPoolType,
  totalTipsCents,
  startDate,
  endDate,
  context,
}: {
  tipPoolType: string;
  totalTipsCents: number;
  startDate: string;
  endDate: string;
  context: Context;
}) {
  if (tipPoolType === "individual") return [];

  const entries = await context.sudo().query.Shift.findMany({
    where: {
      status: { equals: "completed" },
      clockIn: { gte: startDate, lte: endDate },
    },
    query: "id role hoursWorked clockIn clockOut staff { id name }",
  });

  const distributions: Array<{ staffId: string; staffName: string; role: string; hoursWorked: number; amount: number }> = [];

  if (tipPoolType === "house_pool") {
    const eligible = entries
      .map((entry: any) => ({ ...entry, hours: calculateHours(entry) }))
      .filter((entry: any) => entry.staff?.id && entry.hours > 0);
    const totalHours = eligible.reduce((sum: number, entry: any) => sum + entry.hours, 0);

    for (const entry of eligible) {
      const shareCents = totalHours > 0 ? Math.round((entry.hours / totalHours) * totalTipsCents) : 0;
      distributions.push({
        staffId: entry.staff.id,
        staffName: entry.staff.name,
        role: entry.role,
        hoursWorked: entry.hours,
        amount: shareCents,
      });
    }
  } else if (tipPoolType === "pool_by_role") {
    const roleGroups: Record<string, any[]> = {};
    for (const entry of entries) {
      const hours = calculateHours(entry);
      if (!entry.staff?.id || hours <= 0) continue;
      const role = entry.role || "server";
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push({ ...entry, hours });
    }

    for (const [role, roleEntries] of Object.entries(roleGroups)) {
      const rolePercent = ROLE_PERCENTAGES[role] || 10;
      const roleTipsCents = Math.round((rolePercent / 100) * totalTipsCents);
      const totalRoleHours = roleEntries.reduce((sum, entry) => sum + entry.hours, 0);

      for (const entry of roleEntries) {
        const shareCents = totalRoleHours > 0 ? Math.round((entry.hours / totalRoleHours) * roleTipsCents) : 0;
        distributions.push({
          staffId: entry.staff.id,
          staffName: entry.staff.name,
          role,
          hoursWorked: entry.hours,
          amount: shareCents,
        });
      }
    }
  }

  return distributions;
}

export async function createTipPoolLedger(
  root: any,
  args: CreateTipPoolArgs,
  context: Context
): Promise<TipPoolMutationResult> {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage tip pools" };
  }

  if (!["individual", "pool_by_role", "house_pool"].includes(args.tipPoolType)) {
    return { success: false, error: "Invalid tip pool type" };
  }

  try {
    const { start, end } = getBusinessDayWindow(args.date);
    const cashTips = dollarsToCents(args.cashTips);
    const creditTips = dollarsToCents(args.creditTips);
    const totalTips = cashTips + creditTips;

    if (totalTips <= 0) return { success: false, error: "Tip pool must include cash or credit tips" };

    const existing = await context.sudo().query.TipPool.findMany({
      where: {
        date: { gte: start.toISOString(), lte: end.toISOString() },
        tipPoolType: { equals: args.tipPoolType },
        status: { in: ["open", "calculated"] },
      },
      query: "id status tipPoolType",
      take: 1,
    });

    if (existing.length > 0) {
      return { success: false, error: "An open or calculated tip pool already exists for this date and type" };
    }

    const distributions = await calculateDistributions({
      tipPoolType: args.tipPoolType,
      totalTipsCents: totalTips,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      context,
    });

    if (args.tipPoolType !== "individual" && distributions.length === 0) {
      return { success: false, error: "No completed shifts found for this tip pool" };
    }

    await context.sudo().db.TipPool.createOne({
      data: {
        date: start.toISOString(),
        tipPoolType: args.tipPoolType,
        totalTips,
        cashTips,
        creditTips,
        distributions,
        status: "calculated",
        createdBy: context.session?.itemId ? { connect: { id: context.session.itemId } } : undefined,
      },
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateTipPoolStatus(
  root: any,
  args: UpdateTipPoolStatusArgs,
  context: Context
): Promise<TipPoolMutationResult> {
  if (!permissions.canManageStaff({ session: context.session })) {
    return { success: false, error: "Not authorized to manage tip pools" };
  }

  try {
    const tipPool = await context.sudo().query.TipPool.findOne({
      where: { id: args.tipPoolId },
      query: "id status",
    });
    if (!tipPool) return { success: false, error: "Tip pool not found" };

    if (args.action === "distribute") {
      if (tipPool.status !== "calculated") return { success: false, error: "Only calculated tip pools can be distributed" };
      await context.sudo().db.TipPool.updateOne({ where: { id: args.tipPoolId }, data: { status: "distributed" } });
    } else if (args.action === "reopen") {
      if (tipPool.status !== "distributed") return { success: false, error: "Only distributed tip pools can be reopened" };
      await context.sudo().db.TipPool.updateOne({ where: { id: args.tipPoolId }, data: { status: "calculated" } });
    } else {
      return { success: false, error: "Invalid tip pool action" };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
