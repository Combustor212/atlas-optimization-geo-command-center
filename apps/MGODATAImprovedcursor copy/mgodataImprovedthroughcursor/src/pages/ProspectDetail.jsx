
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 as ReloadIcon, ArrowLeft } from "lucide-react";
import { Prospect } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { runDeterministicScan } from "@/api/functions";

// -----------------------------
// Utility UI bits
// -----------------------------

function ScoreRing({ label, value }) {
  const v = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  
  const getRingColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };
  
  return (
    <Card className="rounded-2xl shadow-sm bg-white/80 backdrop-blur-sm border-slate-200/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="relative grid place-items-center w-16 h-16">
          <svg viewBox="0 0 36 36" className={`w-16 h-16 ${getRingColor(v)}`}>
            <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="currentColor" opacity={0.1} strokeWidth={4} />
            <path
              d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeDasharray={`${v}, 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="absolute text-xl font-semibold text-slate-800">{Math.round(v)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">/100</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, hint }) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="text-sm font-medium text-slate-700">{k}</div>
      <div className="text-sm text-right max-w-[60%] text-slate-900">
        {hint ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{v}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          v
        )}
      </div>
    </div>
  );
}

function MissingList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((m) => (
        <Badge key={m} variant="secondary" className="rounded-full bg-red-100 text-red-800 border-red-200">
          Missing: {m}
        </Badge>
      ))}
    </div>
  );
}

// -----------------------------
// Main component
// -----------------------------

export default function ProspectDetail({ prospectId: propProspectId, initialScanData, initialProspectData }) {
  const [prospect, setProspect] = useState(initialProspectData || null);
  const [loading, setLoading] = useState(!initialProspectData);
  const [err, setErr] = useState(null);

  const [scan, setScan] = useState(initialScanData || null);
  const [scanLoading, setScanLoading] = useState(false);
  
  const navigate = useNavigate();

  const prospectId = propProspectId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") || undefined : undefined);

  // Load prospect details only if not provided initially
  useEffect(() => {
    if (initialProspectData) return;
      
    let mounted = true;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        if (!prospectId) throw new Error("No prospect id provided in URL");
        const data = await Prospect.get(prospectId);
        if (mounted) {
            if (data) {
                setProspect(data);
            } else {
                throw new Error(`Prospect with ID ${prospectId} not found.`);
            }
        }
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load prospect data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [prospectId, initialProspectData]);

  // Trigger scan
  async function handleScan() {
    if (!prospect) return;
    setScanLoading(true);
    setErr(null);
    try {
      const response = await runDeterministicScan({
        business_name: prospect.businessName,
        city: prospect.city,
        website_domain: prospect.website ? prospect.website.replace(/^https?:\/\//, "") : ""
      });
      
      const data = response.data;
      
      if (!response || response.status !== 200) {
        const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }
      setScan(data);
    } catch (e) {
      console.error("Scan failed:", e.message);
      setErr(e.message || "Scan failed. Check the console for details.");
    } finally {
      setScanLoading(false);
    }
  }

  const isStandalonePage = !!prospectId;

  const header = (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        {isStandalonePage && (
            <Button variant="ghost" onClick={() => navigate(createPageUrl('GeoMeoOperator'))} className="mb-2 -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Operator
            </Button>
        )}
        <h1 className="text-3xl font-bold text-slate-900">
            {isStandalonePage ? "Prospect Detail" : "Scan Result"}
        </h1>
        <p className="text-sm text-muted-foreground">View scores, evidence, and run scans.</p>
      </div>
      {isStandalonePage && (
        <div className="flex items-center gap-2">
            <Button onClick={() => handleScan()} disabled={scanLoading || !prospect} className="bg-indigo-600 hover:bg-indigo-700">
            {scanLoading ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : "Run GEO/MEO Scan"}
            </Button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {header}
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (err && !scan) { // Only show full-page error if there's no scan data to display
    return (
      <div className="p-6 space-y-4">
        {header}
        <Alert variant="destructive">
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!prospect && !scan) {
    return (
      <div className="p-6 space-y-4">
        {header}
        <Alert>
          <AlertTitle>Not found</AlertTitle>
          <AlertDescription>This prospect does not exist or could not be loaded.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const s = scan?.scores || { MEO: 0, GEO: 0, FINAL: 0 };
  const g = scan?.evidence?.google || {};
  const w = scan?.evidence?.website || {};

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {header}

      {/* Show scan-specific error here, without wiping the UI */}
      {err && scan && (
         <Alert variant="destructive">
          <AlertTitle>Scan Error</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* Prospect header card */}
      <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
        <CardContent className="p-6 grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Business</div>
            <div className="text-lg font-semibold">{prospect?.businessName || scan?.business}</div>
            <div className="text-sm text-muted-foreground">{prospect?.city || scan?.city}{prospect?.niche ? ` • ${prospect.niche}` : ""}</div>
            {prospect?.website && (
              <a className="text-sm underline text-indigo-600 hover:text-indigo-800" href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noreferrer">{prospect.website}</a>
            )}
            {scan?.place_id && (
              <div className="mt-2 text-xs text-muted-foreground">Place ID: <code>{scan.place_id}</code></div>
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScoreRing label="MEO" value={s.MEO} />
            <ScoreRing label="GEO" value={s.GEO} />
            <ScoreRing label="Final" value={s.FINAL} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="google">Google Evidence</TabsTrigger>
          <TabsTrigger value="website">Website Evidence</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">What we checked</h3>
                  <div className="text-sm text-muted-foreground">Deterministic rubric with missing-signal handling. No random scores.</div>
                  <MissingList items={scan?.missing} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Timing</h3>
                  <Row k="Last scan" v={scan?.checked_at ? new Date(scan.checked_at).toLocaleString() : "—"} />
                  <Row k="Weights used (MEO)" v={scan?.weights?.MEO_total_weight_used ?? "—"} />
                  <Row k="Weights used (GEO)" v={scan?.weights?.GEO_total_weight_used ?? "—"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="mt-4">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardContent className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Profile</h3>
                <Row k="Status" v={g.businessStatus || "—"} />
                <Row k="Rating" v={g.rating ?? "—"} />
                <Row k="Review count" v={g.userRatingCount ?? "—"} />
                <Row k="Primary types" v={<span>{g.types?.slice(0,3).join(", ") || "—"}</span>} />
                <Row k="Photos" v={g.photosCount ?? 0} />
                <Row k="Website in GBP" v={g.websiteUri ? <a className="underline text-indigo-600" href={g.websiteUri} target="_blank" rel="noreferrer">Open</a> : "—"} />
                <Row k="Maps link" v={g.googleMapsUri ? <a className="underline text-indigo-600" href={g.googleMapsUri} target="_blank" rel="noreferrer">Open in Maps</a> : "—"} />
              </div>
              <div>
                <h3 className="font-semibold mb-2">NAP</h3>
                <Row k="Phone" v={g.nationalPhoneNumber || "—"} />
                <Row k="Address" v={g.formattedAddress || "—"} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="website" className="mt-4">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardContent className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Basics</h3>
                <Row k="URL" v={w.url ? <a className="underline text-indigo-600" href={w.url} target="_blank" rel="noreferrer">{w.url}</a> : "—"} />
                <Row k="HTTP 200" v={w.http200 ? "Yes" : "No"} />
                <Row k="Title tag" v={w.hasTitle ? "Yes" : "No"} />
                <Row k="Meta description" v={w.hasMetaDescription ? "Yes" : "No"} />
                <Row k="Open Graph" v={w.hasOG ? "Yes" : "No"} />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Entity & Content</h3>
                <Row k="LocalBusiness/Organization schema" v={w.schemaValid ? "Present" : "Missing"} />
                <Row k="FAQ present" v={w.faqPresent ? "Yes" : "No"} />
                <Row k="sameAs links" v={w.sameAsCount ?? 0} />
                <Row k="Service/location pages" v={w.serviceOrLocationPagesFound ?? 0} />
                <Row k="Phone matches GBP" v={w.napPhoneMatch ? <Badge className="rounded-full bg-green-100 text-green-800 border-green-200">Match</Badge> : <Badge variant="destructive" className="rounded-full">Mismatch</Badge>} />
                <Row k="Address matches GBP" v={w.napAddressMatch ? <Badge className="rounded-full bg-green-100 text-green-800 border-green-200">Match</Badge> : <Badge variant="destructive" className="rounded-full">Mismatch</Badge>} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Scan history will be available here in a future update.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {scan?.notes && scan.notes.length > 0 && (
        <Card className="rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Notes & Next Steps</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-700">
              {scan.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
