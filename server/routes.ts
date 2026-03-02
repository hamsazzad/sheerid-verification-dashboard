import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";
import {
  runVerification,
  parseVerificationId,
  generateRandomName,
  generateEmail,
  generateBirthDate,
  TOOL_CONFIGS,
  checkVerificationStatus,
} from "./sheerid-engine";
import { startTelegramBot } from "./telegram-bot";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const adminSessions = new Map<string, { email: string; expiresAt: number }>();

function generateSessionToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    adminSessions.delete(token || "");
    return res.status(401).json({ message: "Session expired" });
  }
  next();
}

const runVerificationSchema = z.object({
  toolId: z.string().min(1),
  url: z.string().min(1),
  proxy: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  birthDate: z.string().optional(),
  universityId: z.string().optional(),
  autoGenerate: z.boolean().optional(),
});

const addUniversitySchema = z.object({
  orgId: z.number().int().positive(),
  name: z.string().min(1),
  domain: z.string().optional(),
  country: z.string().min(1),
  weight: z.number().int().min(0).max(100).optional(),
  successRate: z.number().int().min(0).max(100).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();
  startTelegramBot();

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = generateSessionToken();
      adminSessions.set(token, {
        email,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      return res.json({ token, email });
    }
    return res.status(401).json({ message: "Invalid credentials" });
  });

  app.get("/api/admin/me", requireAdmin, (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const session = adminSessions.get(token || "");
    res.json({ email: session?.email });
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    adminSessions.delete(token || "");
    res.json({ success: true });
  });

  app.get("/api/admin/verifications", requireAdmin, async (_req, res) => {
    try {
      const verifications = await storage.getAllVerifications();
      res.json(verifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  app.get("/api/admin/verifications/:id", requireAdmin, async (req, res) => {
    try {
      const verifications = await storage.getAllVerifications();
      const v = verifications.find(ver => ver.id === req.params.id);
      if (!v) return res.status(404).json({ message: "Verification not found" });
      res.json(v);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verification" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const [allStats, allVerifications, tools] = await Promise.all([
        storage.getAllStats(),
        storage.getAllVerifications(),
        storage.getAllTools(),
      ]);
      const totalAttempts = allStats.reduce((sum, s) => sum + s.totalAttempts, 0);
      const totalSuccess = allStats.reduce((sum, s) => sum + s.successCount, 0);
      const totalFailed = allStats.reduce((sum, s) => sum + s.failedCount, 0);
      const successRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;

      res.json({
        summary: { totalAttempts, totalSuccess, totalFailed, successRate, activeTools: tools.filter(t => t.isActive).length, totalTools: tools.length },
        stats: allStats,
        recentVerifications: allVerifications.slice(0, 50),
        toolBreakdown: tools.map(t => {
          const s = allStats.find(st => st.toolId === t.id);
          return { toolId: t.id, name: t.name, attempts: s?.totalAttempts || 0, success: s?.successCount || 0, failed: s?.failedCount || 0 };
        }),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  const BOT_API_SECRET = process.env.BOT_API_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";

  function requireBotAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${BOT_API_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  app.get("/api/bot/user/:telegramId", requireBotAuth, async (req, res) => {
    try {
      const user = await storage.getTelegramUser(req.params.telegramId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/bot/user/referral/:code", requireBotAuth, async (req, res) => {
    try {
      const user = await storage.getTelegramUserByReferralCode(req.params.code);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/bot/user", requireBotAuth, async (req, res) => {
    try {
      const { telegramId, username, firstName, referredBy } = req.body;
      const existing = await storage.getTelegramUser(telegramId);
      if (existing) return res.json(existing);

      const crypto = await import("crypto");
      const referralCode = crypto.randomBytes(4).toString("hex");
      const user = await storage.createTelegramUser({
        telegramId,
        username: username || null,
        firstName: firstName || null,
        tokens: 0,
        referralCode,
        referredBy: referredBy || null,
        hasJoinedChannel: false,
        lastDaily: null,
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/bot/user/:telegramId", requireBotAuth, async (req, res) => {
    try {
      const updated = await storage.updateTelegramUser(req.params.telegramId, req.body);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/bot/user/:telegramId/addtokens", requireBotAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      const updated = await storage.addTokens(req.params.telegramId, amount);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to add tokens" });
    }
  });

  app.post("/api/bot/user/:telegramId/deducttokens", requireBotAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      const updated = await storage.deductTokens(req.params.telegramId, amount);
      if (!updated) return res.status(404).json({ message: "Insufficient tokens or user not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to deduct tokens" });
    }
  });

  app.get("/api/bot/users", requireBotAuth, async (_req, res) => {
    try {
      const users = await storage.getAllTelegramUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/bot/ai", requireBotAuth, async (req, res) => {
    try {
      const { message, systemPrompt, userContext } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      const fullMessages = [
        { role: "system", content: systemPrompt || "You are a helpful Telegram bot assistant." },
        ...(userContext ? [{ role: "system", content: `User context: ${userContext}` }] : []),
        { role: "user", content: message },
      ];

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const aiRes = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: fullMessages,
          model: "openai",
          seed: Math.floor(Math.random() * 100000),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!aiRes.ok) {
        return res.status(502).json({ message: "AI service unavailable" });
      }

      const reply = await aiRes.text();
      res.json({ reply: reply.trim() });
    } catch (error: any) {
      if (error.name === "AbortError") {
        return res.status(504).json({ message: "AI request timed out" });
      }
      res.status(500).json({ message: "AI request failed" });
    }
  });

  app.get("/api/tools", async (_req, res) => {
    try {
      const tools = await storage.getAllTools();
      res.json(tools);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.get("/api/tools/:id", async (req, res) => {
    try {
      const tool = await storage.getToolById(req.params.id);
      if (!tool) return res.status(404).json({ message: "Tool not found" });
      res.json(tool);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tool" });
    }
  });

  app.patch("/api/tools/:id/toggle", async (req, res) => {
    try {
      const tool = await storage.getToolById(req.params.id);
      if (!tool) return res.status(404).json({ message: "Tool not found" });
      const updated = await storage.updateToolActive(req.params.id, !tool.isActive);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle tool" });
    }
  });

  app.get("/api/verifications", async (_req, res) => {
    try {
      const verifications = await storage.getAllVerifications();
      res.json(verifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getAllStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/universities", async (_req, res) => {
    try {
      const universities = await storage.getAllUniversities();
      res.json(universities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch universities" });
    }
  });

  app.post("/api/universities", async (req, res) => {
    try {
      const parsed = addUniversitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid university data", errors: parsed.error.flatten() });
      }
      const university = await storage.createUniversity({
        orgId: parsed.data.orgId,
        name: parsed.data.name,
        domain: parsed.data.domain || null,
        country: parsed.data.country,
        weight: parsed.data.weight ?? 50,
        successRate: parsed.data.successRate ?? 50,
      });
      res.json(university);
    } catch (error) {
      res.status(500).json({ message: "Failed to add university" });
    }
  });

  app.delete("/api/universities/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUniversity(req.params.id);
      if (!deleted) return res.status(404).json({ message: "University not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete university" });
    }
  });

  app.post("/api/verifications/run", async (req, res) => {
    try {
      const parsed = runVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      const { toolId, url, proxy } = parsed.data;

      const tool = await storage.getToolById(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }
      if (!tool.isActive) {
        return res.status(400).json({ message: "This tool is currently disabled" });
      }

      const verificationId = parseVerificationId(url);
      if (!verificationId) {
        return res.status(400).json({
          message: "Could not extract verificationId from URL. URL must contain verificationId=<hex> parameter.",
        });
      }

      const config = TOOL_CONFIGS[toolId];
      if (!config) {
        return res.status(400).json({ message: `No SheerID configuration for tool: ${toolId}` });
      }

      const isAutoGenerate = parsed.data.autoGenerate !== false;

      if (!isAutoGenerate) {
        const missing: string[] = [];
        if (!parsed.data.firstName?.trim()) missing.push("firstName");
        if (!parsed.data.lastName?.trim()) missing.push("lastName");
        if (!parsed.data.email?.trim()) missing.push("email");
        if (!parsed.data.birthDate?.trim()) missing.push("birthDate");
        if (missing.length > 0) {
          return res.status(400).json({
            message: `Manual mode requires: ${missing.join(", ")}`,
            errors: Object.fromEntries(missing.map(f => [f, ["Required when auto-generate is off"]])),
          });
        }
      }

      let firstName: string;
      let lastName: string;
      if (isAutoGenerate && (!parsed.data.firstName || !parsed.data.lastName)) {
        const generated = generateRandomName();
        firstName = parsed.data.firstName?.trim() || generated.firstName;
        lastName = parsed.data.lastName?.trim() || generated.lastName;
      } else {
        firstName = parsed.data.firstName!.trim();
        lastName = parsed.data.lastName!.trim();
      }

      let email: string;
      let birthDate: string;
      if (isAutoGenerate) {
        email = parsed.data.email?.trim() || generateEmail(firstName, lastName, "psu.edu");
        birthDate = parsed.data.birthDate?.trim() || generateBirthDate(config.verifyType);
      } else {
        email = parsed.data.email!.trim();
        birthDate = parsed.data.birthDate!.trim();
      }

      const uniName = config.verifyType === "k12teacher" ? "K12 School" : "Pennsylvania State University";
      const orgId = config.verifyType === "k12teacher" ? 155694 : 2565;

      const verification = await storage.createVerification({
        toolId,
        status: "processing",
        email,
        university: uniName,
        name: `${firstName} ${lastName}`,
        country: "US",
        url,
        proxy: proxy || null,
        firstName,
        lastName,
        birthDate,
        organizationId: orgId,
        sheeridVerificationId: verificationId,
        errorMessage: null,
        documentImages: null,
        waterfallSteps: null,
      });

      try {
        const result = await runVerification({
          toolId,
          verificationId,
          firstName,
          lastName,
          email,
          birthDate,
          organizationId: orgId,
          organizationName: uniName,
          url,
        });

        let finalStatus: string = "failed";
        let errorMsg: string | null = null;
        let finalRedirectUrl = result.redirectUrl;
        let finalRewardCode = result.rewardCode;

        const docImages = result.documentImages || null;
        const waterfallSteps = result.steps || null;

        if (result.success && !result.pending) {
          finalStatus = "success";
        } else if (result.success && result.pending) {
          await storage.updateVerification(verification.id, {
            status: "pending",
            errorMessage: null,
            sheeridVerificationId: verificationId,
            documentImages: docImages,
            waterfallSteps,
          });

          const maxPolls = 30;
          const pollInterval = 10000;
          let resolved = false;

          for (let i = 0; i < maxPolls; i++) {
            await new Promise(r => setTimeout(r, pollInterval));
            try {
              const pollResult = await checkVerificationStatus(verificationId);
              if (pollResult.currentStep === "success") {
                finalStatus = "success";
                finalRedirectUrl = pollResult.redirectUrl || finalRedirectUrl;
                finalRewardCode = pollResult.rewardCode || finalRewardCode;
                resolved = true;
                break;
              } else if (pollResult.currentStep === "error" || (pollResult.errorIds && pollResult.errorIds.length > 0)) {
                finalStatus = "failed";
                errorMsg = `Verification rejected: ${(pollResult.errorIds || []).join(", ") || "document review failed"}`;
                resolved = true;
                break;
              }
            } catch {
            }
          }

          if (!resolved) {
            finalStatus = "failed";
            errorMsg = "Verification timed out waiting for SheerID review";
          }
        } else {
          finalStatus = "failed";
          errorMsg = result.message;
        }

        await storage.updateVerification(verification.id, {
          status: finalStatus,
          errorMessage: errorMsg,
          sheeridVerificationId: verificationId,
          documentImages: docImages,
          waterfallSteps,
        });

        const isSuccess = finalStatus === "success";
        await storage.incrementStats(toolId, isSuccess);

        const updatedList = await storage.getAllVerifications();
        const finalVerification = updatedList.find(v => v.id === verification.id);

        return res.json({
          verification: finalVerification,
          steps: result.steps,
          rewardCode: finalRewardCode,
          redirectUrl: finalRedirectUrl,
          currentStep: result.currentStep,
        });

      } catch (fetchError: any) {
        const errorMessage = fetchError.name === "TimeoutError"
          ? "SheerID API request timed out"
          : `Verification engine error: ${fetchError.message}`;

        await storage.updateVerification(verification.id, {
          status: "failed",
          errorMessage,
        });
        await storage.incrementStats(toolId, false);

        const updatedList = await storage.getAllVerifications();
        const failedVerification = updatedList.find(v => v.id === verification.id);
        return res.json({ verification: failedVerification });
      }
    } catch (error: any) {
      console.error("Run verification error:", error);
      res.status(500).json({ message: "Failed to run verification: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/verifications/:id/status", async (req, res) => {
    try {
      const verification = await storage.getAllVerifications();
      const v = verification.find(ver => ver.id === req.params.id);
      if (!v || !v.sheeridVerificationId) {
        return res.status(404).json({ message: "Verification not found" });
      }

      const status = await checkVerificationStatus(v.sheeridVerificationId);

      if (status.currentStep === "success" && v.status !== "success") {
        await storage.updateVerification(v.id, { status: "success", errorMessage: null });
      } else if (status.currentStep === "error" && v.status === "pending") {
        const errMsg = `Verification rejected: ${(status.errorIds || []).join(", ") || "document review failed"}`;
        await storage.updateVerification(v.id, { status: "failed", errorMessage: errMsg });
      }

      res.json({
        ...status,
        dbStatus: v.status,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to check status: " + error.message });
    }
  });

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const [allTools, allStats, allVerifications, chartData] = await Promise.all([
        storage.getAllTools(),
        storage.getAllStats(),
        storage.getAllVerifications(),
        storage.getChartData(7),
      ]);

      const totalAttempts = allStats.reduce((sum, s) => sum + s.totalAttempts, 0);
      const totalSuccess = allStats.reduce((sum, s) => sum + s.successCount, 0);
      const totalFailed = allStats.reduce((sum, s) => sum + s.failedCount, 0);
      const successRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
      const activeTools = allTools.filter(t => t.isActive).length;

      res.json({
        tools: allTools,
        stats: allStats,
        verifications: allVerifications.slice(0, 20),
        chartData,
        summary: { totalAttempts, totalSuccess, totalFailed, successRate, activeTools },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  return httpServer;
}
