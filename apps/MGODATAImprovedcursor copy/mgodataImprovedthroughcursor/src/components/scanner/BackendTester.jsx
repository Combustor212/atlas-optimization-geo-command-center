import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

export default function BackendTester() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [testCity, setTestCity] = useState("Chicago");
  const [testBusiness, setTestBusiness] = useState("Joe's Pizza");

  // Test Functions - direct API calls
  const testFunctions = [
    {
      name: "placesGeocodeAPI",
      url: "/api/placesGeocodeAPI", // Direct API endpoint
      method: "POST",
      payload: { city: testCity },
      description: "Geocode city to coordinates"
    },
    {
      name: "placesAutocompleteAPI", 
      url: "/api/placesAutocompleteAPI",
      method: "POST", 
      payload: { input: testBusiness, sessionToken: crypto.randomUUID() },
      description: "Search for business suggestions"
    },
    {
      name: "runDeterministicScan",
      url: "/api/runDeterministicScan",
      method: "POST",
      payload: { business_name: testBusiness, city: testCity, website_domain: "joespizza.com" },
      description: "Run full scoring analysis"
    }
  ];

  const testFunction = async (func) => {
    const loadingKey = func.name;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      console.log(`Testing ${func.name} at ${func.url}`);
      
      const response = await fetch(func.url, {
        method: func.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(func.payload)
      });

      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [func.name]: {
          success: response.ok,
          status: response.status,
          data,
          url: func.url,
          timestamp: new Date().toISOString()
        }
      }));

      console.log(`${func.name} result:`, data);

    } catch (error) {
      console.error(`${func.name} error:`, error);
      setTestResults(prev => ({
        ...prev,
        [func.name]: {
          success: false,
          error: error.message,
          url: func.url,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const testAll = async () => {
    for (const func of testFunctions) {
      await testFunction(func);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const ResultCard = ({ func, result }) => {
    if (!result) return null;

    return (
      <Card className="mt-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {result.success ? 
              <CheckCircle2 className="w-4 h-4 text-green-600" /> : 
              <XCircle className="w-4 h-4 text-red-600" />
            }
            {func.name}
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.status || "Error"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-slate-500">
            <strong>URL:</strong> {result.url}
          </div>
          <div className="text-xs text-slate-500">
            <strong>Time:</strong> {new Date(result.timestamp).toLocaleString()}
          </div>
          {result.success && result.data && (
            <div className="text-xs">
              <strong>Response Data:</strong>
              <pre className="mt-1 p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
          {result.error && (
            <div className="text-xs text-red-600">
              <strong>Error:</strong> {result.error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Base44 Backend Function Tester
        </CardTitle>
        <p className="text-sm text-slate-600">
          Test your Base44 function endpoints to confirm URLs and functionality.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Test City</label>
            <Input 
              value={testCity} 
              onChange={(e) => setTestCity(e.target.value)}
              placeholder="Chicago"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Test Business</label>
            <Input 
              value={testBusiness} 
              onChange={(e) => setTestBusiness(e.target.value)}
              placeholder="Joe's Pizza"
            />
          </div>
        </div>

        {/* Test Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={testAll} disabled={Object.values(loading).some(Boolean)}>
            {Object.values(loading).some(Boolean) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test All Functions
          </Button>
          
          {testFunctions.map(func => (
            <Button 
              key={func.name}
              variant="outline" 
              onClick={() => testFunction(func)}
              disabled={loading[func.name]}
            >
              {loading[func.name] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Test {func.name}
            </Button>
          ))}
        </div>

        {/* Function List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Expected Function URLs:</h3>
          {testFunctions.map(func => (
            <div key={func.name} className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{func.name}</div>
                  <div className="text-xs text-slate-500">{func.description}</div>
                  <div className="text-xs font-mono text-slate-600">{func.method} {func.url}</div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testFunction(func)}
                  disabled={loading[func.name]}
                >
                  {loading[func.name] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
                </Button>
              </div>
              
              <ResultCard func={func} result={testResults[func.name]} />
            </div>
          ))}
        </div>

        {/* Debug Info */}
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Debug Information</h4>
            <div className="text-xs space-y-1 text-slate-600">
              <div><strong>Current Origin:</strong> {window.location.origin}</div>
              <div><strong>Platform:</strong> Standalone (direct API calls)</div>
              <div><strong>Expected URL Pattern:</strong> /api/&#123;functionName&#125;</div>
              <div><strong>PLACES_API_KEY Set:</strong> {testResults.placesGeocodeAPI?.success ? "✅ Yes" : "❓ Unknown"}</div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}