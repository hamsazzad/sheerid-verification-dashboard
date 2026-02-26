import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tools = pgTable("tools", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  target: text("target").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  features: text("features").array().notNull(),
  requirements: text("requirements").array().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id", { length: 50 }).notNull(),
  status: text("status").notNull().default("pending"),
  email: text("email"),
  university: text("university"),
  name: text("name"),
  country: text("country"),
  errorMessage: text("error_message"),
  url: text("url"),
  proxy: text("proxy"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  birthDate: text("birth_date"),
  organizationId: integer("organization_id"),
  sheeridVerificationId: text("sheerid_verification_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stats = pgTable("stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id", { length: 50 }).notNull(),
  totalAttempts: integer("total_attempts").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const universities = pgTable("universities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  country: text("country").notNull(),
  weight: integer("weight").default(50).notNull(),
  successRate: integer("success_rate").default(50),
});

export const telegramUsers = pgTable("telegram_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  tokens: integer("tokens").default(0).notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  hasJoinedChannel: boolean("has_joined_channel").default(false).notNull(),
  lastDaily: timestamp("last_daily"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertToolSchema = createInsertSchema(tools);
export const insertVerificationSchema = createInsertSchema(verifications).omit({ id: true, createdAt: true });
export const insertStatsSchema = createInsertSchema(stats).omit({ id: true, lastUpdated: true });
export const insertUniversitySchema = createInsertSchema(universities).omit({ id: true });
export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({ id: true, createdAt: true });

export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Stats = typeof stats.$inferSelect;
export type InsertStats = z.infer<typeof insertStatsSchema>;
export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
