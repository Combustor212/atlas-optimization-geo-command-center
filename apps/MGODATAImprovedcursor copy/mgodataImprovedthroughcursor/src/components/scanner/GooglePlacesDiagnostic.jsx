import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

/* ---------- UI subcomponent ---------- */
const DiagnosticStep = ({ title, status, message, details }) => {
  const getIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-slate-300" />;
    }
  };
  const getBgColor = () => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };
  return (
    <div className={`p-4 rounded-lg border ${getBgColor()}`}>
      <div className="flex items-center gap-3 mb-2">
        {getIcon()}
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-700 mb-2">{message}</p>
      {details && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer hover:text-slate-800">
            Technical Details
          </summary>
          <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-auto">
            {details}
          </pre>
        </details>
      )}
    </div>
  );
};

/* ---------- Main component ---------- */
export default function GooglePlacesDiagnostic() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<"pending" | "running" | "success" | "warning" | "error">("pending");

  // helper to immutably update the steps array we keep locally
  const updateLocal = (arr, id, patch) => {
    const idx = arr.findIndex((d) => d.id === id);
    if (idx === -1) return arr;
    const next = [...arr];
    next[idx] = { ...next[idx], ...patch };
    setDiagnostics(next);
    return next;
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setOverallStatus("running");

    // single source of truth for current steps during run
    let steps = [
      {
        id: "geocode-health",
        title: "1. Geocode Health (Backend + Google)",
        status: "loading",
        message: "Calling /api/places/geocode to verify backend + API key...",
        details: null,
      },
      {
        id: "autocomplete-test",
        title: "2. Autocomplete Endpoint Test",
        status: "pending",
        message: "Will test business search with optional city bias...",
        details: null,
      },
      {
        id: "details-test",
        title: "3. Details Endpoint Test",
        status: "pending",
        message: "Will fetch place details using a prediction’s place_id...",
        details: null,
      },
    ];
    setDiagnostics(steps);

    /* ---- STEP 1: Geocode health (proves backend + key + Google) ---- */
    let bias = null;
    try {
      const r = await fetch("/api/places/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // use a well-known city; doesn't matter which — we just need a 200 OK with status:"OK"
        body: JSON.stringify({ city: "New York, NY" }),
      });
      const data = await r.json();

      if (data?.status === "OK" && data?.location) {
        bias = { location: data.location, radius: data.radius || 30000 };
        steps = updateLocal(steps, "geocode-health", {
          status: "success",
          message: "Backend reachable and Google Geocoding responded OK.",
          details: JSON.stringify(data, null, 2),
        });
      } else {
        steps = updateLocal(steps, "geocode-health", {
          status: "error",
          message: `Geocode returned: ${data?.status || "UNKNOWN"}`,
          details: JSON.stringify(data, null, 2),
        });
      }
    } catch (e: any) {
      steps = updateLocal(steps, "geocode-health", {
        status: "error",
        message:
          "Request to /api/places/geocode failed (backend route missing or runtime error).",
        details: String(e),
      });
      // we still continue; autocomplete may work without bias
    }

    /* ---- STEP 2: Autocomplete test ---- */
    steps = updateLocal(steps, "autocomplete-test", {
      status: "loading",
      message: "Testing /api/places/autocomplete…",
    });

    let firstPrediction: any = null;
    const sessionToken = "diag-" + Math.random().toString(36).slice(2);

    try {
      const r = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "Starbucks",
          sessionToken,
          components: "country:us",
          ...(bias ? { location: bias.location, radius: bias.radius } : {}),
        }),
      });
      const data = await r.json();

      if (data?.status === "OK" && Array.isArray(data.predictions) && data.predictions.length) {
        firstPrediction = data.predictions[0];
        steps = updateLocal(steps, "autocomplete-test", {
          status: "success",
          message: `Autocomplete OK — ${data.predictions.length} predictions.`,
          details: JSON.stringify(firstPrediction, null, 2),
        });
      } else if (data?.status === "ZERO_RESULTS") {
        steps = updateLocal(steps, "autocomplete-test", {
          status: "warning",
          message: "Autocomplete returned ZERO_RESULTS — try a different input.",
          details: JSON.stringify(data, null, 2),
        });
      } else {
        steps = updateLocal(steps, "autocomplete-test", {
          status: "error",
          message: `Autocomplete returned: ${data?.status || "UNKNOWN"}`,
          details: JSON.stringify(data, null, 2),
        });
      }
    } catch (e: any) {
      steps = updateLocal(steps, "autocomplete-test", {
        status: "error",
        message: "Request to /api/places/autocomplete failed.",
        details: String(e),
      });
    }

    /* ---- STEP 3: Details test ---- */
    steps = updateLocal(steps, "details-test", {
      status: "loading",
      message: "Testing /api/places/details…",
    });

    try {
      const r = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          firstPrediction?.place_id
            ? {
                placeId: firstPrediction.place_id,
                sessionToken,
                fields: ["place_id", "name", "formatted_address", "formatted_phone_number", "website", "types", "rating", "user_ratings_total"],
              }
            : {
                // fallback: well-known Google Sydney place_id, same as you had
                placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
                fields: ["place_id", "name", "formatted_address"],
              }
        ),
      });
      const data = await r.json();

      if (data?.status === "OK" && data?.result) {
        steps = updateLocal(steps, "details-test", {
          status: "success",
          message: "Details endpoint OK.",
          details: JSON.stringify(data.result, null, 2),
        });
      } else {
        steps = updateLocal(steps, "details-test", {
          status: "error",
          message: `Details returned: ${data?.status || "UNKNOWN"}`,
          details: JSON.stringify(data, null, 2),
        });
      }
    } catch (e: any) {
      steps = updateLocal(steps, "details-test", {
        status: "error",
        message: "Request to /api/places/details failed.",
        details: String(e),
      });
    }

    /* ---- Final overall status (use the latest local steps, not stale state) ---- */
    const hasError = steps.some((s) => s.status === "error");
    const hasWarning = steps.some((s) => s.status === "warning");

    setOverallStatus(hasError ? "error" : hasWarning ? "warning" : "success");
    setIsRunning(false);
  };

  const backendFailed =
    diagnostics.find((d) => d.id === "geocode-health")?.status === "error";

  const instructions = backendFailed
    ? {
        title: "Backend Setup Required",
        steps: [
          "1) Create the serverless functions: /api/places/geocode, /api/places/autocomplete, /api/places/details.",
          "2) Ensure PLACES_API_KEY is added as a secret (server-side only).",
          "3) In Google Cloud, enable Places API + Geocoding API and turn on billing.",
          "4) Re-deploy, then re-run this diagnostic.",
        ],
      }
    : {
        title: "Google Cloud Setup Check",
        steps: [
          "1) Verify your API key is NOT restricted to 'Websites' (server key only).",
          "2) Confirm Places API + Geocoding API are enabled.",
          "3) Check billing & quotas.",
          "4) Re-run this diagnostic or test endpoints in DevTools Console.",
        ],
      };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-blue-600" />
          Google Places API Diagnostics
          {overallStatus === "success" && (
            <Badge className="bg-green-100 text-green-800">
              ✅ All Systems Operational
            </Badge>
          )}
          {overallStatus === "error" && (
            <Badge className="bg-red-100 text-red-800">❌ Issues Detected</Badge>
          )}
          {overallStatus === "warning" && (
            <Badge className="bg-yellow-100 text-yellow-800">⚠️ Warnings</Badge>
          )}
        </CardTitle>
        <p className="text-slate-600">
          Health check for Google Places API endpoints and connectivity.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Full Diagnostic
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              window.open(
                "https://console.cloud.google.com/apis/credentials",
                "_blank"
              )
            }
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Google Cloud Console
          </Button>
        </div>

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            {diagnostics.map((d) => (
              <DiagnosticStep key={d.id} {...d} />
            ))}
          </div>
        )}

        {(overallStatus === "error" || diagnostics.length === 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="mb-3">
                <strong>{instructions.title}</strong>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {instructions.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === "success" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>✅ Google Places endpoints are working.</strong> You’re
              ready to run real GEO/MEO scans.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
