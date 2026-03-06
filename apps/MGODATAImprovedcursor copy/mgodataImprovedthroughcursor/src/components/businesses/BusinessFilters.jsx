import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

const CATEGORIES = [
  "restaurant", "retail", "services", "healthcare", "automotive",
  "real_estate", "fitness", "beauty", "legal", "financial", "other"
];

const STATUSES = ["active", "pending_audit", "needs_attention", "suspended"];

export default function BusinessFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (type, value) => {
    onFiltersChange(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select 
          value={filters.category} 
          onValueChange={(value) => handleFilterChange('category', value)}
        >
          <SelectTrigger className="w-40 bg-white/80 border-slate-200">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Select 
        value={filters.status} 
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className="w-36 bg-white/80 border-slate-200">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map(status => (
            <SelectItem key={status} value={status}>
              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}