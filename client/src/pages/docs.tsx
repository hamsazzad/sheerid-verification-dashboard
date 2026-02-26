import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Terminal, AlertTriangle, Lightbulb, ArrowRight, Database, Globe, Zap, FileImage, Wand2 } from "lucide-react";

export default function Docs() {
  return (
    <div className="min-h-full" data-testid="docs-page">
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Documentation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Complete guide for the SheerID Verification Tool Dashboard</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">How Verification Works (Waterfall Flow)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            This dashboard implements the full multi-step waterfall verification flow. When you run a verification, here's exactly what happens:
          </p>

          <div className="space-y-3">
            {[
              { step: "1", title: "URL Parsing", desc: "The verificationId is extracted from the URL parameter (verificationId=<hex>). This is the SheerID verification session ID." },
              { step: "2", title: "Identity Generation", desc: "If auto-generate is enabled, a realistic identity is created: name from pattern-based generator, PSU email (firstName.lastName+digits@psu.edu), and age-appropriate date of birth." },
              { step: "3", title: "Document Generation", desc: "High-quality document images are generated using Puppeteer screenshots of HTML templates: LionPATH portal for students, Faculty ID card + Employment letter for teachers, Employee Access Center for K12." },
              { step: "4", title: "Personal Info Submission", desc: "POST to /rest/v2/verification/{id}/step/collectStudentPersonalInfo or collectTeacherPersonalInfo with org data, device fingerprint, and metadata." },
              { step: "5", title: "SSO Skip", desc: "DELETE /rest/v2/verification/{id}/step/sso to bypass the single sign-on step and proceed to document upload." },
              { step: "6", title: "Document Upload Request", desc: "POST to /step/docUpload with file metadata (name, MIME type, size) to obtain pre-signed S3 upload URLs." },
              { step: "7", title: "S3 Upload", desc: "PUT the generated document PNG to the pre-signed S3 URL. For teacher tools, both the ID card and employment letter are uploaded." },
              { step: "8", title: "Complete Upload", desc: "POST to /step/completeDocUpload to finalize the submission. SheerID then either auto-approves or queues for manual review." },
              { step: "9", title: "Result Recording", desc: "The verification result, SheerID ID, and all waterfall step details are persisted to the database. Statistics are updated." },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h4 className="text-xs font-semibold">Auto-Generation</h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Identity data is auto-generated matching the original bot: pattern-based names, PSU emails, age-appropriate DOBs, and weighted random university selection.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <FileImage className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-semibold">Document Templates</h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Three document types: LionPATH student portal screenshot, PSU Faculty ID card with employment letter, and K12 Employee Access Center page.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h4 className="text-xs font-semibold">Real-Time Stats</h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
              All statistics and charts are computed from actual verification records in the database. No simulated or random data.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h4 className="text-xs font-semibold">Student Verification</h4>
            </div>
            <ul className="space-y-2">
              {[
                "Tools: Spotify Premium, YouTube Premium, Gemini Advanced",
                "Program ID: 67c8c14f5f17a83b745e3f82",
                "Endpoint: collectStudentPersonalInfo",
                "Document: LionPATH student enrollment portal screenshot",
                "DOB range: 2000-2005, PSU campus weighted selection"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h4 className="text-xs font-semibold">Teacher Verification</h4>
            </div>
            <ul className="space-y-2">
              {[
                "Tools: Bolt.new, Canva Education (program 68cc6a2e...)",
                "K12 Tool: ChatGPT Plus (program 68d47554...)",
                "Endpoint: collectTeacherPersonalInfo",
                "Documents: Faculty ID card + Employment certificate letter",
                "K12: Employee Access Center screenshot with job summary"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Using the Dashboard</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2">1. Select a Tool</p>
              <p className="text-[11px] text-muted-foreground">
                From the Dashboard or Tools page, click on any verification tool card to view its details, statistics, and features. Click "Run Verification" to start.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-2">2. Paste the Verification URL</p>
              <p className="text-[11px] text-muted-foreground">
                Enter the SheerID verification URL containing the verificationId parameter. With auto-generate enabled (default), all other fields are filled automatically.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-2">3. Review Waterfall Results</p>
              <p className="text-[11px] text-muted-foreground">
                After submission, each waterfall step is shown with its status. The result indicates success (instant approval), pending (awaiting manual review), or failed with error details.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-2">4. Check Verification Status</p>
              <p className="text-[11px] text-muted-foreground">
                For pending verifications, use the status check endpoint to poll SheerID for updates. When approved, the reward code or redirect URL will be returned.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">API Reference</h3>
          </div>
          <div className="space-y-3">
            {[
              { method: "GET", path: "/api/dashboard", desc: "Dashboard data with stats, tools, recent verifications, and 7-day activity chart" },
              { method: "GET", path: "/api/tools", desc: "List all verification tools with their configurations" },
              { method: "PATCH", path: "/api/tools/:id/toggle", desc: "Toggle a tool's active/disabled state" },
              { method: "GET", path: "/api/verifications", desc: "List verification history (last 100 records)" },
              { method: "POST", path: "/api/verifications/run", desc: "Run full waterfall verification. Body: { toolId, url, autoGenerate?, firstName?, lastName?, email?, birthDate?, universityId?, proxy? }" },
              { method: "GET", path: "/api/verifications/:id/status", desc: "Check SheerID verification status for a pending verification" },
              { method: "GET", path: "/api/stats", desc: "Get per-tool statistics (attempts, success, failed counts)" },
              { method: "GET", path: "/api/universities", desc: "List all universities with org IDs and weights" },
              { method: "POST", path: "/api/universities", desc: "Add a new university. Body: { orgId, name, domain?, country, weight?, successRate? }" },
              { method: "DELETE", path: "/api/universities/:id", desc: "Delete a university from the database" },
            ].map((endpoint, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-md bg-muted/30">
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 mt-0.5 ${
                  endpoint.method === "GET" ? "text-emerald-400 border-emerald-500/30" :
                  endpoint.method === "POST" ? "text-blue-400 border-blue-500/30" :
                  endpoint.method === "PATCH" ? "text-amber-400 border-amber-500/30" :
                  "text-red-400 border-red-500/30"
                }`}>
                  {endpoint.method}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono font-medium">{endpoint.path}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{endpoint.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Tool Configurations</h3>
          </div>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Tool</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Program ID</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tool: "Spotify / YouTube / Gemini", type: "Student", pid: "67c8c14f...", endpoint: "collectStudentPersonalInfo" },
                    { tool: "Bolt.new / Canva", type: "Teacher", pid: "68cc6a2e...", endpoint: "collectTeacherPersonalInfo" },
                    { tool: "ChatGPT Plus", type: "K12 Teacher", pid: "68d47554...", endpoint: "collectTeacherPersonalInfo" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-muted/50">
                      <td className="py-2 font-medium">{row.tool}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{row.type}</Badge>
                      </td>
                      <td className="py-2 font-mono text-muted-foreground">{row.pid}</td>
                      <td className="py-2 font-mono text-muted-foreground">{row.endpoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-amber-500">Disclaimer</h4>
              <p className="text-[11px] text-amber-500/70 mt-1 leading-relaxed">
                This project is for educational purposes only. The tools demonstrate how verification systems work and how they can be tested. Do not use this for fraudulent purposes. Respect the Terms of Service of all platforms.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
