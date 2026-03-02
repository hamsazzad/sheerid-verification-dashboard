import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  LogOut,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  FileImage,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <Badge className="bg-green-500/10 text-green-600 border-green-500/20" data-testid={`status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/10 text-red-600 border-red-500/20" data-testid={`status-${status}`}><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20" data-testid={`status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20" data-testid={`status-${status}`}><Activity className="w-3 h-3 mr-1" />{status}</Badge>;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const adminFetch = (url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => {
      if (r.status === 401) { onLogout(); throw new Error("Session expired"); }
      return r.json();
    });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminFetch("/api/admin/stats"),
    refetchInterval: 30000,
  });

  const { data: verifications, isLoading: verificationsLoading } = useQuery({
    queryKey: ["/api/admin/verifications"],
    queryFn: () => adminFetch("/api/admin/verifications"),
    refetchInterval: 15000,
  });

  const summary = statsData?.summary || {};
  const allVerifications: any[] = verifications || [];
  const filtered = allVerifications.filter((v: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(s) ||
      v.email?.toLowerCase().includes(s) ||
      v.toolId?.toLowerCase().includes(s) ||
      v.sheeridVerificationId?.toLowerCase().includes(s) ||
      v.status?.toLowerCase().includes(s) ||
      v.university?.toLowerCase().includes(s)
    );
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    localStorage.removeItem("adminToken");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <Badge variant="outline" className="text-xs">SheerID Dashboard</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card data-testid="stat-total-attempts">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{summary.totalAttempts || 0}</p>
              <p className="text-xs text-muted-foreground">Total Attempts</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-success">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.totalSuccess || 0}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-failed">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.totalFailed || 0}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-rate">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.successRate || 0}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-tools">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{summary.activeTools || 0}/{summary.totalTools || 0}</p>
              <p className="text-xs text-muted-foreground">Active Tools</p>
            </CardContent>
          </Card>
        </div>

        {statsData?.toolBreakdown && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tool Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statsData.toolBreakdown.filter((t: any) => t.attempts > 0).map((t: any) => (
                  <div key={t.toolId} className="border rounded-lg p-3" data-testid={`tool-breakdown-${t.toolId}`}>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.attempts} runs · <span className="text-green-600">{t.success} ok</span> · <span className="text-red-600">{t.failed} fail</span>
                    </p>
                  </div>
                ))}
                {(!statsData.toolBreakdown || statsData.toolBreakdown.every((t: any) => t.attempts === 0)) && (
                  <p className="text-sm text-muted-foreground col-span-full">No verifications yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Verifications ({filtered.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search verifications..."
                  className="pl-9"
                  data-testid="input-search-verifications"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 px-3 font-medium">Tool</th>
                    <th className="py-2 px-3 font-medium">Name</th>
                    <th className="py-2 px-3 font-medium">Email</th>
                    <th className="py-2 px-3 font-medium">University</th>
                    <th className="py-2 px-3 font-medium">Date</th>
                    <th className="py-2 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationsLoading && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading verifications...</td></tr>
                  )}
                  {!verificationsLoading && filtered.map((v: any) => (
                    <Fragment key={v.id}>
                      <tr className="border-b hover:bg-muted/50 cursor-pointer" data-testid={`row-verification-${v.id}`}>
                        <td className="py-2 px-3"><StatusBadge status={v.status} /></td>
                        <td className="py-2 px-3 font-medium">{v.toolId}</td>
                        <td className="py-2 px-3">{v.name || "-"}</td>
                        <td className="py-2 px-3 text-xs">{v.email || "-"}</td>
                        <td className="py-2 px-3 text-xs max-w-[200px] truncate">{v.university || "-"}</td>
                        <td className="py-2 px-3 text-xs">{new Date(v.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVerification(v)}
                            data-testid={`button-view-${v.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                          >
                            {expandedRow === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </td>
                      </tr>
                      {expandedRow === v.id && (
                        <tr key={`${v.id}-details`}>
                          <td colSpan={7} className="px-3 py-3 bg-muted/30">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="font-medium text-muted-foreground">SheerID Verification ID</p>
                                <p className="font-mono mt-1 break-all">{v.sheeridVerificationId || "-"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">DOB</p>
                                <p className="mt-1">{v.birthDate || "-"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">Org ID</p>
                                <p className="mt-1">{v.organizationId || "-"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">URL</p>
                                <p className="mt-1 break-all max-w-[250px] truncate">{v.url || "-"}</p>
                              </div>
                            </div>
                            {v.errorMessage && (
                              <div className="mt-2">
                                <p className="font-medium text-muted-foreground text-xs">Error</p>
                                <p className="text-xs text-red-600 mt-1 break-all">{v.errorMessage}</p>
                              </div>
                            )}
                            {v.documentImages && Array.isArray(v.documentImages) && v.documentImages.length > 0 && (
                              <div className="mt-3">
                                <p className="font-medium text-muted-foreground text-xs flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Uploaded Documents</p>
                                <div className="flex gap-3 mt-2 flex-wrap">
                                  {v.documentImages.map((doc: any, idx: number) => (
                                    <div key={idx} className="border rounded p-2 bg-background">
                                      <img
                                        src={`data:${doc.mimeType};base64,${doc.base64}`}
                                        alt={doc.fileName}
                                        className="max-w-[300px] max-h-[200px] object-contain rounded"
                                        data-testid={`img-doc-${v.id}-${idx}`}
                                      />
                                      <p className="text-[10px] text-muted-foreground mt-1 text-center">{doc.fileName}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {v.waterfallSteps && Array.isArray(v.waterfallSteps) && v.waterfallSteps.length > 0 && (
                              <div className="mt-3">
                                <p className="font-medium text-muted-foreground text-xs">Waterfall Steps</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {v.waterfallSteps.map((step: any, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className={step.status >= 200 && step.status < 300 ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}
                                    >
                                      {step.step} ({step.status})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">No verifications found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Verification Details
            </DialogTitle>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Status</p>
                  <StatusBadge status={selectedVerification.status} />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Tool</p>
                  <p>{selectedVerification.toolId}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Name</p>
                  <p>{selectedVerification.name || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Email</p>
                  <p className="break-all">{selectedVerification.email || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">DOB</p>
                  <p>{selectedVerification.birthDate || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">University</p>
                  <p>{selectedVerification.university || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">SheerID ID</p>
                  <p className="font-mono text-xs break-all">{selectedVerification.sheeridVerificationId || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Org ID</p>
                  <p>{selectedVerification.organizationId || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium text-muted-foreground">URL</p>
                  <p className="break-all text-xs">{selectedVerification.url || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium text-muted-foreground">Date</p>
                  <p>{new Date(selectedVerification.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedVerification.errorMessage && (
                <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg p-3">
                  <p className="font-medium text-red-700 dark:text-red-400 text-sm">Error Message</p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1 break-all">{selectedVerification.errorMessage}</p>
                </div>
              )}

              {selectedVerification.waterfallSteps && Array.isArray(selectedVerification.waterfallSteps) && selectedVerification.waterfallSteps.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Waterfall Steps</p>
                  <div className="space-y-1">
                    {selectedVerification.waterfallSteps.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs border rounded px-3 py-1.5">
                        <span className={`font-mono ${step.status >= 200 && step.status < 300 ? "text-green-600" : "text-red-600"}`}>{step.status}</span>
                        <span className="font-medium">{step.step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVerification.documentImages && Array.isArray(selectedVerification.documentImages) && selectedVerification.documentImages.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2 flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Uploaded Documents</p>
                  <div className="space-y-3">
                    {selectedVerification.documentImages.map((doc: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">{doc.fileName}</p>
                        <img
                          src={`data:${doc.mimeType};base64,${doc.base64}`}
                          alt={doc.fileName}
                          className="w-full max-h-[500px] object-contain rounded border"
                          data-testid={`img-detail-doc-${idx}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
