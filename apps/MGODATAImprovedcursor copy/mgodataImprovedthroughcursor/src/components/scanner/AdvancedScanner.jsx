import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Target, 
  Building,
  Loader2,
  MapPin,
  Globe,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

// Dummy detail component until you wire in analytics
const ProspectDetail = ({ initialScanData }) => (
  <Card className="mt-6 border-slate-200 shadow">
    <CardHeader>
      <CardTitle>Scan Results</CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto">
        {JSON.stringify(initialScanData, null, 2)}
      </pre>
    </CardContent>
  </Card>
);

export default function AdvancedScanner() {
  const [form, setForm] = useState({
    name: "",
    city: "",
    domain: "",
  });
  
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const runAdvancedScan = async () => {
    if (!form.name || !form.city) {
      setError("Please fill in at least business name and city.");
      return;
    }

    setLoading(true);
    setScanResult(null);
    setError(null);
    
    try {
      const response = await fetch("/functions/runDeterministicScan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.name.trim(),
          city: form.city.trim(),
          website_domain: form.domain?.trim() || undefined,
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        // Show detailed error with all available info
        const errorDetails = [
          data.error || "Unknown error",
          data.details,
          data.hint,
          data.status && `Status: ${data.status}`,
          data.query && `Query: ${data.query}`
        ].filter(Boolean).join("\n");
        
        throw new Error(errorDetails);
      }
      
      console.log("Advanced Scan result:", data);
      setScanResult(data);

    } catch (err) {
      console.error("Advanced scan failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Scanner Form */}
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-indigo-600" />
            Advanced GEO/MEO Analysis
          </CardTitle>
          <p className="text-slate-600">Run a one-off deterministic scan for any business.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Business Name *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Joe's Pizza"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                City *
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Chicago"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="domain" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website Domain (optional)
              </Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="joespizza.com"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={runAdvancedScan}
              disabled={loading || !form.name || !form.city}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message with Details */}
      {error && (
        <Card className="bg-red-50 border-red-200 text-red-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-2">Scan Error</p>
                <pre className="text-sm whitespace-pre-wrap font-mono bg-red-100 p-3 rounded mb-3">{error}</pre>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Troubleshooting steps:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Check your API configuration in src/config/apiKeys.js</li>
                    <li>Ensure PLACES_API_KEY is set with your Google API key</li>
                    <li>In Google Cloud Console, enable "Places API (New)"</li>
                    <li>Make sure billing is enabled for your Google Cloud project</li>
                    <li>Try a well-known business like "McDonald's Chicago" to test</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scanResult && (
        <ProspectDetail initialScanData={scanResult} />
      )}
    </div>
  );
}