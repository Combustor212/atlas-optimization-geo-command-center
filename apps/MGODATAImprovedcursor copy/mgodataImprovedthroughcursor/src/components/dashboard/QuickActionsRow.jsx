import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Send, Sparkles as SparklesIcon } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function QuickActionsRow({ businessId, locationId }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(null);

  const track = (event, payload) =>
    window.lgb?.track?.(event, payload);

  async function optimizeListing() {
    if (busy) return;
    setBusy("optimize");
    track("meo_audit_started", { businessId, locationId });
    try {
      // Stubbing the API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      const data = { auditId: `aud_${Math.random().toString(36).slice(2)}` };
      
      toast.success("Google listing audit kicked off.");
      track("meo_audit_completed", { businessId, locationId, auditId: data.auditId || null });
      
      // Navigate to the maps health tab for that business
      nav(createPageUrl(`BusinessDetail?id=${businessId}&tab=maps_audits`));

    } catch (e) {
      toast.error(`Optimize failed: ${e.message}`);
      track("meo_audit_error", { message: String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function requestReviews() {
    if (busy) return;
    setBusy("reviews");
    track("review_campaign_started", { businessId, locationId, source: "quick_action" });
    try {
      // Stubbing the API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      const data = { campaignId: `camp_${Math.random().toString(36).slice(2)}` };

      toast.success("Review campaign created. You can add contacts next.");
      
      // Navigate to the reviews tab
      nav(createPageUrl(`BusinessDetail?id=${businessId}&tab=reviews`));
      
    } catch (e) {
      toast.error(`Request Reviews failed: ${e.message}`);
      track("review_campaign_error", { message: String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function checkAIMentions() {
    if (busy) return;
    setBusy("mentions");
    track("geo_scan_started", { businessId, locationId, source: "quick_action" });
    try {
      // Stubbing the API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const data = { 
        scanId: `scn_${Math.random().toString(36).slice(2)}`,
        score: { total: Math.floor(Math.random() * 30) + 65 }
      };

      toast.success(`AI visibility scan complete. Score: ${data?.score?.total ?? "—"}/100`);
      track("geo_scan_completed", { scanId: data.scanId || null, score: data?.score?.total ?? null });

      // Navigate to AI visibility tab
      nav(createPageUrl(`BusinessDetail?id=${businessId}&tab=ai_visibility`));

    } catch (e) {
      toast.error(`AI mentions check failed: ${e.message}`);
      track("geo_scan_error", { message: String(e) });
    } finally {
      setBusy(null);
    }
  }

  const getButtonContent = (action, text, Icon) => {
    if (busy === action) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {text}...
        </>
      );
    }
    return (
      <>
        <Icon className="w-4 h-4 mr-2" />
        {text}
      </>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Button variant="outline" className="w-full justify-start bg-white/70 hover:bg-white border-slate-200 text-sm h-12" onClick={optimizeListing} disabled={!!busy}>
        {getButtonContent("optimize", "Optimize Listing", MapPin)}
      </Button>
      <Button variant="outline" className="w-full justify-start bg-white/70 hover:bg-white border-slate-200 text-sm h-12" onClick={requestReviews} disabled={!!busy}>
        {getButtonContent("reviews", "Request Reviews", Send)}
      </Button>
      <Button variant="outline" className="w-full justify-start bg-white/70 hover:bg-white border-slate-200 text-sm h-12" onClick={checkAIMentions} disabled={!!busy}>
        {getButtonContent("mentions", "Check AI Mentions", SparklesIcon)}
      </Button>
    </div>
  );
}