import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

export default function BusinessCard({ business, onUpdate }) {
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 border-yellow-200";
    return "text-red-600 bg-red-100 border-red-200";
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-700 border-green-200",
      pending_audit: "bg-yellow-100 text-yellow-700 border-yellow-200",
      needs_attention: "bg-red-100 text-red-700 border-red-200",
      suspended: "bg-gray-100 text-gray-700 border-gray-200"
    };
    return colors[status] || colors.active;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {business.name}
            </CardTitle>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {business.address}
            </p>
          </div>
          <Badge className={`${getScoreColor(business.visibility_score || 0)} border font-semibold`}>
            {business.visibility_score || 0}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          {business.phone && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {business.phone}
            </p>
          )}
          {business.website && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <a href={business.website} target="_blank" rel="noopener noreferrer" 
                 className="hover:text-blue-600 transition-colors">
                {business.website}
              </a>
            </p>
          )}
        </div>

        {/* Status and Category */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {business.category?.replace(/_/g, ' ')}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(business.status)}`}>
            {business.status?.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Scores Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">{business.ai_score || 0}%</div>
            <div className="text-xs text-slate-500">AI Score</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">{business.maps_score || 0}%</div>
            <div className="text-xs text-slate-500">Maps</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900 flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              {business.average_rating || 0}
            </div>
            <div className="text-xs text-slate-500">{business.reviews_count || 0} reviews</div>
          </div>
        </div>

        {/* Last Audit */}
        {business.last_audit_date && (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Last audit: {format(new Date(business.last_audit_date), 'MMM d, yyyy')}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <BarChart3 className="w-3 h-3 mr-1" />
            Audit
          </Button>
          {business.google_business_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={business.google_business_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>

        {/* Alert for low scores */}
        {(business.visibility_score || 0) < 60 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-700">Needs attention to improve visibility</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}