
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Target,
  Loader2,
  Globe,
  MapPin,
  Building,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

export default function OperatorPanel() {
  const [form, setForm] = useState({
    businessName: "",
    city: "",
    domain: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const runScan = async () => {
    if (!form.businessName || !form.city) {
      setError({ error: "Business name and city are required." });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("Sending request with:", {
        business_name: form.businessName,
        city: form.city,
        website_domain: form.domain
      });

      const response = await fetch("/functions/runDeterministicScan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.businessName,
          city: form.city,
          website_domain: form.domain || undefined
        }),
      });

      console.log("Response status:", response.status);
      
      const data = await response.json();
      console.log("Response data:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        // Create structured error object
        const errorObj = {
          error: data.error || "Scan failed",
          fix: data.fix || null,
          details: data.details || null,
        };
        console.log("Backend error details:", JSON.stringify(errorObj, null, 2));
        setError(errorObj);
        return;
      }

      setResult(data);
    } catch (err) {
      console.log("Catch block error:", err.message || String(err));
      
      // Handle different types of errors
      if (err && typeof err === 'object' && err.error) {
        // Already structured error
        setError(err);
      } else if (err && typeof err === 'object' && err.message) {
        // JavaScript Error object
        setError({ error: err.message });
      } else {
        // Unknown error type
        setError({ error: "An unknown error occurred. Check console for details." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Scanner Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            GEO/MEO Quick Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building className="w-4 h-4" /> Business Name *
              </Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => handleInputChange("businessName", e.target.value)}
                placeholder="McDonald's"
              />
            </div>

            <div>
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> City *
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="Chicago"
              />
            </div>

            <div>
              <Label htmlFor="domain" className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Website Domain (optional)
              </Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(e) => handleInputChange("domain", e.target.value)}
                placeholder="mcdonalds.com"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={runScan}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" /> Run Scan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border border-red-200">
          <CardContent className="p-4 space-y-2 text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error.error || "Scan failed"}</span>
            </div>

            {/* Helpful Fix Link */}
            {error.fix && (
              <a
                href={error.fix}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" /> Enable API
              </a>
            )}

            {error.details && (
              <p className="text-xs text-slate-600">Details: {error.details}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle>{result.business} — {result.city}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>MEO:</strong> {result.scores?.MEO ?? "N/A"}%</p>
            <p><strong>GEO:</strong> {result.scores?.GEO ?? "N/A"}%</p>
            <p><strong>FINAL:</strong> {result.scores?.FINAL ?? "N/A"}%</p>
            <p><strong>Checked at:</strong> {new Date(result.checked_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
