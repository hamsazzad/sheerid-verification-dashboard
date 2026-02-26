import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, GraduationCap, Globe, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { University } from "@shared/schema";

export default function Universities() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrgId, setNewOrgId] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newWeight, setNewWeight] = useState("50");
  const [newSuccessRate, setNewSuccessRate] = useState("50");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: universities, isLoading } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: {
      orgId: number;
      name: string;
      domain?: string;
      country: string;
      weight?: number;
      successRate?: number;
    }) => {
      const res = await apiRequest("POST", "/api/universities", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "University Added", description: `${newName} has been added to the database` });
      setShowAdd(false);
      setNewName("");
      setNewOrgId("");
      setNewDomain("");
      setNewCountry("");
      setNewWeight("50");
      setNewSuccessRate("50");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add university", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/universities/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "University Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newOrgId.trim() || !newCountry.trim()) return;
    addMutation.mutate({
      orgId: parseInt(newOrgId),
      name: newName.trim(),
      domain: newDomain.trim() || undefined,
      country: newCountry.trim(),
      weight: parseInt(newWeight) || 50,
      successRate: parseInt(newSuccessRate) || 50,
    });
  };

  const filtered = universities?.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.country.toLowerCase().includes(search.toLowerCase()) ||
    (u.domain && u.domain.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const countryGroups = filtered.reduce<Record<string, number>>((acc, u) => {
    acc[u.country] = (acc[u.country] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-full max-w-xs" />
        <Card className="p-4"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  return (
    <div className="min-h-full" data-testid="universities-page">
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Universities</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{universities?.length || 0} universities across {Object.keys(countryGroups).length} countries</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search universities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-testid="input-search-universities"
              />
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-university">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(countryGroups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([country, count]) => (
              <Badge
                key={country}
                variant="secondary"
                className="text-[10px] cursor-pointer"
                onClick={() => setSearch(country)}
              >
                <Globe className="w-2.5 h-2.5 mr-1" />
                {country} ({count})
              </Badge>
            ))}
        </div>

        {filtered.length > 0 ? (
          <div className="rounded-md border border-border/50" data-testid="universities-table">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground">University</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Org ID</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Domain</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Country</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Weight</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Success Rate</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(uni => (
                  <TableRow key={uni.id} className="border-border/30" data-testid={`uni-row-${uni.orgId}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium">{uni.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{uni.orgId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{uni.domain || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{uni.country}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${uni.weight}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{uni.weight}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {uni.successRate !== null ? (
                        <span className={`text-xs font-medium ${(uni.successRate || 0) >= 50 ? 'text-emerald-500' : 'text-red-400'}`}>
                          {uni.successRate}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => deleteMutation.mutate(uni.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-university-${uni.orgId}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-universities">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No universities found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md" data-testid="add-university-dialog">
          <DialogHeader>
            <DialogTitle className="text-base">Add University</DialogTitle>
            <DialogDescription className="text-xs">Add a new university to the verification database</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="uniName" className="text-xs font-medium">University Name *</Label>
              <Input
                id="uniName"
                placeholder="Harvard University"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-sm"
                required
                data-testid="input-university-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="orgId" className="text-xs font-medium">SheerID Org ID *</Label>
                <Input
                  id="orgId"
                  type="number"
                  placeholder="12345"
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value)}
                  className="text-sm"
                  required
                  data-testid="input-org-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-xs font-medium">Country *</Label>
                <Input
                  id="country"
                  placeholder="USA"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="text-sm"
                  required
                  data-testid="input-country"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-xs font-medium">Domain (Optional)</Label>
              <Input
                id="domain"
                placeholder="harvard.edu"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="text-sm"
                data-testid="input-domain"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-xs font-medium">Weight (0-100)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  max="100"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="text-sm"
                  data-testid="input-weight"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successRate" className="text-xs font-medium">Success Rate (0-100)</Label>
                <Input
                  id="successRate"
                  type="number"
                  min="0"
                  max="100"
                  value={newSuccessRate}
                  onChange={(e) => setNewSuccessRate(e.target.value)}
                  className="text-sm"
                  data-testid="input-success-rate"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newName.trim() || !newOrgId.trim() || !newCountry.trim() || addMutation.isPending}
                data-testid="button-submit-university"
              >
                {addMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding...</>
                ) : (
                  <><Plus className="w-3.5 h-3.5 mr-1.5" />Add University</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
