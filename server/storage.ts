import {
  tools, verifications, stats, universities, telegramUsers,
  type Tool, type InsertTool,
  type Verification, type InsertVerification,
  type Stats, type InsertStats,
  type University, type InsertUniversity,
  type TelegramUser, type InsertTelegramUser,
} from "@shared/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getAllTools(): Promise<Tool[]>;
  getToolById(id: string): Promise<Tool | undefined>;
  upsertTool(tool: InsertTool): Promise<Tool>;
  updateToolActive(id: string, isActive: boolean): Promise<Tool | undefined>;

  getAllVerifications(): Promise<Verification[]>;
  getVerificationsByTool(toolId: string): Promise<Verification[]>;
  createVerification(v: InsertVerification): Promise<Verification>;
  updateVerification(id: string, data: Partial<InsertVerification>): Promise<Verification | undefined>;
  getChartData(days: number): Promise<Array<{ date: string; success: number; failed: number }>>;

  getAllStats(): Promise<Stats[]>;
  getStatsByTool(toolId: string): Promise<Stats | undefined>;
  upsertStats(s: InsertStats): Promise<Stats>;
  incrementStats(toolId: string, success: boolean): Promise<Stats>;

  getAllUniversities(): Promise<University[]>;
  getUniversityById(id: string): Promise<University | undefined>;
  createUniversity(u: InsertUniversity): Promise<University>;
  deleteUniversity(id: string): Promise<boolean>;

  getTelegramUser(telegramId: string): Promise<TelegramUser | undefined>;
  getTelegramUserByReferralCode(code: string): Promise<TelegramUser | undefined>;
  createTelegramUser(u: InsertTelegramUser): Promise<TelegramUser>;
  updateTelegramUser(telegramId: string, data: Partial<InsertTelegramUser>): Promise<TelegramUser | undefined>;
  addTokens(telegramId: string, amount: number): Promise<TelegramUser | undefined>;
  deductTokens(telegramId: string, amount: number): Promise<TelegramUser | undefined>;
  getAllTelegramUsers(): Promise<TelegramUser[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllTools(): Promise<Tool[]> {
    return db.select().from(tools);
  }

  async getToolById(id: string): Promise<Tool | undefined> {
    const rows = await db.select().from(tools).where(eq(tools.id, id));
    return rows[0];
  }

  async upsertTool(tool: InsertTool): Promise<Tool> {
    const existing = await this.getToolById(tool.id);
    if (existing) {
      const [updated] = await db.update(tools).set(tool).where(eq(tools.id, tool.id)).returning();
      return updated;
    }
    const [created] = await db.insert(tools).values(tool).returning();
    return created;
  }

  async updateToolActive(id: string, isActive: boolean): Promise<Tool | undefined> {
    const [updated] = await db.update(tools).set({ isActive }).where(eq(tools.id, id)).returning();
    return updated;
  }

  async getAllVerifications(): Promise<Verification[]> {
    return db.select().from(verifications).orderBy(desc(verifications.createdAt)).limit(100);
  }

  async getVerificationsByTool(toolId: string): Promise<Verification[]> {
    return db.select().from(verifications).where(eq(verifications.toolId, toolId)).orderBy(desc(verifications.createdAt));
  }

  async createVerification(v: InsertVerification): Promise<Verification> {
    const [created] = await db.insert(verifications).values(v).returning();
    return created;
  }

  async updateVerification(id: string, data: Partial<InsertVerification>): Promise<Verification | undefined> {
    const [updated] = await db.update(verifications).set(data).where(eq(verifications.id, id)).returning();
    return updated;
  }

  async getChartData(days: number): Promise<Array<{ date: string; success: number; failed: number }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const rows = await db.select({
      date: sql<string>`to_char(${verifications.createdAt}, 'YYYY-MM-DD')`,
      status: verifications.status,
    }).from(verifications).where(gte(verifications.createdAt, cutoff));

    const dayMap: Record<string, { success: number; failed: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { success: 0, failed: 0 };
    }

    for (const row of rows) {
      if (dayMap[row.date]) {
        if (row.status === "success") {
          dayMap[row.date].success++;
        } else if (row.status === "failed") {
          dayMap[row.date].failed++;
        }
      }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Object.entries(dayMap).map(([dateStr, counts]) => {
      const d = new Date(dateStr + "T12:00:00Z");
      return {
        date: dayNames[d.getUTCDay()],
        ...counts,
      };
    });
  }

  async getAllStats(): Promise<Stats[]> {
    return db.select().from(stats);
  }

  async getStatsByTool(toolId: string): Promise<Stats | undefined> {
    const rows = await db.select().from(stats).where(eq(stats.toolId, toolId));
    return rows[0];
  }

  async upsertStats(s: InsertStats): Promise<Stats> {
    const existing = await this.getStatsByTool(s.toolId);
    if (existing) {
      const [updated] = await db.update(stats).set(s).where(eq(stats.toolId, s.toolId)).returning();
      return updated;
    }
    const [created] = await db.insert(stats).values(s).returning();
    return created;
  }

  async incrementStats(toolId: string, success: boolean): Promise<Stats> {
    let existing = await this.getStatsByTool(toolId);
    if (!existing) {
      existing = await this.upsertStats({ toolId, totalAttempts: 0, successCount: 0, failedCount: 0 });
    }
    const [updated] = await db.update(stats).set({
      totalAttempts: existing.totalAttempts + 1,
      successCount: existing.successCount + (success ? 1 : 0),
      failedCount: existing.failedCount + (success ? 0 : 1),
      lastUpdated: new Date(),
    }).where(eq(stats.toolId, toolId)).returning();
    return updated;
  }

  async getAllUniversities(): Promise<University[]> {
    return db.select().from(universities);
  }

  async getUniversityById(id: string): Promise<University | undefined> {
    const rows = await db.select().from(universities).where(eq(universities.id, id));
    return rows[0];
  }

  async createUniversity(u: InsertUniversity): Promise<University> {
    const [created] = await db.insert(universities).values(u).returning();
    return created;
  }

  async deleteUniversity(id: string): Promise<boolean> {
    const result = await db.delete(universities).where(eq(universities.id, id)).returning();
    return result.length > 0;
  }

  async getTelegramUser(telegramId: string): Promise<TelegramUser | undefined> {
    const rows = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, telegramId));
    return rows[0];
  }

  async getTelegramUserByReferralCode(code: string): Promise<TelegramUser | undefined> {
    const rows = await db.select().from(telegramUsers).where(eq(telegramUsers.referralCode, code));
    return rows[0];
  }

  async createTelegramUser(u: InsertTelegramUser): Promise<TelegramUser> {
    const [created] = await db.insert(telegramUsers).values(u).returning();
    return created;
  }

  async updateTelegramUser(telegramId: string, data: Partial<InsertTelegramUser>): Promise<TelegramUser | undefined> {
    const [updated] = await db.update(telegramUsers).set(data).where(eq(telegramUsers.telegramId, telegramId)).returning();
    return updated;
  }

  async addTokens(telegramId: string, amount: number): Promise<TelegramUser | undefined> {
    const user = await this.getTelegramUser(telegramId);
    if (!user) return undefined;
    const [updated] = await db.update(telegramUsers)
      .set({ tokens: user.tokens + amount })
      .where(eq(telegramUsers.telegramId, telegramId))
      .returning();
    return updated;
  }

  async deductTokens(telegramId: string, amount: number): Promise<TelegramUser | undefined> {
    const user = await this.getTelegramUser(telegramId);
    if (!user || user.tokens < amount) return undefined;
    const [updated] = await db.update(telegramUsers)
      .set({ tokens: user.tokens - amount })
      .where(eq(telegramUsers.telegramId, telegramId))
      .returning();
    return updated;
  }

  async getAllTelegramUsers(): Promise<TelegramUser[]> {
    return db.select().from(telegramUsers).orderBy(desc(telegramUsers.createdAt));
  }
}

export const storage = new DatabaseStorage();
