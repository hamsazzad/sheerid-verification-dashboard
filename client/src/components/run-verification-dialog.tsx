import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Play, AlertCircle, CheckCircle2, XCircle, Wand2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Tool, University } from "@shared/schema";

interface RunVerificationDialogProps {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunVerificationDialog({ tool, open, onOpenChange }: RunVerificationDialogProps) {
  const [url, setUrl] = useState("");
  const [proxy, setProxy] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: universities } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const runMutation = useMutation({
    mutationFn: async (data: {
      toolId: string;
      url: string;
      proxy?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      birthDate?: string;
      universityId?: string;
      autoGenerate?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/verifications/run", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isManualValid = autoGenerate || (firstName.trim() && lastName.trim() && email.trim() && birthDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool || !url.trim()) return;
    if (!autoGenerate && !isManualValid) return;
    setResult(null);

    const payload: any = {
      toolId: tool.id,
      url: url.trim(),
      autoGenerate,
    };

    if (proxy.trim()) payload.proxy = proxy.trim();

    if (!autoGenerate) {
      payload.firstName = firstName.trim();
      payload.lastName = lastName.trim();
      payload.email = email.trim();
      payload.birthDate = birthDate;
      if (universityId) payload.universityId = universityId;
    }

    runMutation.mutate(payload);
  };

  const handleClose = () => {
    onOpenChange(false);
    setUrl("");
    setProxy("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setBirthDate("");
    setUniversityId("");
    setResult(null);
    setShowAdvanced(false);
  };

  if (!tool) return null;

  const verification = result?.verification;
  const steps = result?.steps;

  const isSuccess = verification?.status === "success";
  const isFailed = verification?.status === "failed";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="run-verification-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Play className="w-4 h-4" style={{ color: tool.color }} />
            Run {tool.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Full waterfall verification: personal info &rarr; SSO skip &rarr; document upload &rarr; S3 &rarr; complete
          </DialogDescription>
        </DialogHeader>

        {runMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="verification-waiting">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold" data-testid="text-waiting-title">Please wait, verifying...</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Documents submitted to SheerID. Waiting for the final verification result. This may take a few minutes.
              </p>
            </div>
          </div>
        ) : verification ? (
          <div className="space-y-4 mt-2" data-testid="verification-result">
            <div className={`flex items-start gap-3 p-4 rounded-md border ${
              isSuccess
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-red-500/5 border-red-500/20"
            }`}>
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" data-testid="text-result-status">
                  {isSuccess ? "Verification Successful" : "Verification Failed"}
                </p>
                {isSuccess && (
                  <div className="mt-2">
                    {result?.redirectUrl ? (
                      <a
                        href={result.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        data-testid="link-redirect"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Go to verification page to claim your offer
                      </a>
                    ) : (
                      <a
                        href={verification.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        data-testid="link-sheerid-page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Go to SheerID verification page
                      </a>
                    )}
                    {result?.rewardCode && (
                      <p className="text-xs font-mono mt-2 text-emerald-400" data-testid="text-reward-code">Reward Code: {result.rewardCode}</p>
                    )}
                  </div>
                )}
                {isFailed && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-muted-foreground" data-testid="text-result-error">
                      Try again with a new verification link
                    </p>
                    {verification.errorMessage && (
                      <p className="text-[10px] text-red-400/70 break-all" data-testid="text-error-detail">
                        {verification.errorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium" data-testid="text-result-name">{verification.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium font-mono truncate" data-testid="text-result-email">{verification.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">University</span>
                <p className="font-medium" data-testid="text-result-university">{verification.university}</p>
              </div>
              <div>
                <span className="text-muted-foreground">DOB</span>
                <p className="font-medium" data-testid="text-result-dob">{verification.birthDate}</p>
              </div>
              {verification.sheeridVerificationId && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">SheerID Verification ID</span>
                  <p className="font-medium font-mono text-[10px]" data-testid="text-result-sheerid-id">{verification.sheeridVerificationId}</p>
                </div>
              )}
            </div>

            {steps && steps.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Waterfall Steps</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {steps.map((step: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono ${
                      step.status >= 200 && step.status < 300
                        ? "bg-emerald-500/5 text-emerald-400"
                        : "bg-red-500/5 text-red-400"
                    }`} data-testid={`step-${step.step}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        step.status >= 200 && step.status < 300 ? "bg-emerald-400" : "bg-red-400"
                      }`} />
                      <span>{step.step}</span>
                      <span className="ml-auto">{step.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleClose} data-testid="button-close-result">
                Close
              </Button>
              <Button size="sm" onClick={() => setResult(null)} data-testid="button-run-another">
                Run Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-xs font-medium">SheerID Verification URL *</Label>
              <Input
                id="url"
                placeholder="https://...?verificationId=abc123..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-sm"
                required
                data-testid="input-verification-url"
              />
              <p className="text-[10px] text-muted-foreground">Must contain <code className="font-mono">verificationId=</code> parameter</p>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                <Label htmlFor="auto-generate" className="text-xs font-medium cursor-pointer">
                  Auto-generate identity
                </Label>
              </div>
              <Switch
                id="auto-generate"
                checked={autoGenerate}
                onCheckedChange={setAutoGenerate}
                data-testid="switch-auto-generate"
              />
            </div>

            {!autoGenerate && (
              <div className="space-y-3 p-3 rounded-md border border-dashed">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Required"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="text-sm"
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Required"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="text-sm"
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="required@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-sm"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birthDate" className="text-xs">Date of Birth *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="text-sm"
                    required
                    data-testid="input-birth-date"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="university" className="text-xs">University</Label>
                  <Select value={universityId} onValueChange={setUniversityId}>
                    <SelectTrigger className="text-sm" data-testid="select-university">
                      <SelectValue placeholder="Random (weighted)" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities?.map(uni => (
                        <SelectItem key={uni.id} value={uni.id} data-testid={`option-university-${uni.orgId}`}>
                          {uni.name} ({uni.country})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-advanced"
            >
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-2">
                <Label htmlFor="proxy" className="text-xs font-medium">Proxy</Label>
                <Input
                  id="proxy"
                  placeholder="http://user:pass@host:port"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  className="text-sm"
                  data-testid="input-proxy"
                />
                <p className="text-[10px] text-muted-foreground">Residential proxy recommended for better success rates</p>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/5 border border-amber-500/10">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-500/80">For educational purposes only. Respect all platform Terms of Service.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!url.trim() || !isManualValid || runMutation.isPending}
                data-testid="button-run-verification"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run Verification
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
