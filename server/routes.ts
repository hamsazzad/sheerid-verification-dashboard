import type { Express } from "express";
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
  searchOrganization,
  TOOL_CONFIGS,
  checkVerificationStatus,
} from "./sheerid-engine";
import { startTelegramBot } from "./telegram-bot";

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

      let university;
      if (parsed.data.universityId) {
        university = await storage.getUniversityById(parsed.data.universityId);
      }
      if (!university) {
        const allUnis = await storage.getAllUniversities();
        if (allUnis.length === 0) {
          return res.status(400).json({ message: "No universities in database" });
        }
        const totalWeight = allUnis.reduce((sum, u) => sum + u.weight, 0);
        let rand = Math.random() * totalWeight;
        university = allUnis[0];
        for (const u of allUnis) {
          rand -= u.weight;
          if (rand <= 0) {
            university = u;
            break;
          }
        }
      }

      let resolvedOrgId = university.orgId;
      let resolvedOrgName = university.name;
      const sheeridOrg = await searchOrganization(verificationId, university.name);
      if (sheeridOrg) {
        resolvedOrgId = sheeridOrg.id;
        resolvedOrgName = sheeridOrg.name;
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

      const domain = university.domain || "psu.edu";
      let email: string;
      let birthDate: string;
      if (isAutoGenerate) {
        email = parsed.data.email?.trim() || generateEmail(firstName, lastName, domain);
        birthDate = parsed.data.birthDate?.trim() || generateBirthDate(config.verifyType);
      } else {
        email = parsed.data.email!.trim();
        birthDate = parsed.data.birthDate!.trim();
      }

      const verification = await storage.createVerification({
        toolId,
        status: "processing",
        email,
        university: resolvedOrgName,
        name: `${firstName} ${lastName}`,
        country: university.country,
        url,
        proxy: proxy || null,
        firstName,
        lastName,
        birthDate,
        organizationId: resolvedOrgId,
        sheeridVerificationId: verificationId,
        errorMessage: null,
      });

      try {
        const result = await runVerification({
          toolId,
          verificationId,
          firstName,
          lastName,
          email,
          birthDate,
          organizationId: resolvedOrgId,
          organizationName: resolvedOrgName,
          url,
        });

        let finalStatus: string = "failed";
        let errorMsg: string | null = null;
        let finalRedirectUrl = result.redirectUrl;
        let finalRewardCode = result.rewardCode;

        if (result.success && !result.pending) {
          finalStatus = "success";
        } else if (result.success && result.pending) {
          await storage.updateVerification(verification.id, {
            status: "pending",
            errorMessage: null,
            sheeridVerificationId: verificationId,
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
