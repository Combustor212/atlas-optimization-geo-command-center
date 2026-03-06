
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { waitlistExtractor } from '@/api/functions';
import { Business } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building, Grid3x3, List, Target, Clock, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useGoogleMaps, usePlacesAutocomplete } from '@/components/utils/useGoogleMaps';

// Format Google Places type to readable category (e.g. "restaurant" -> "Restaurant")
function formatTypeToCategory(types) {
  if (!types?.length) return '';
  const first = types[0];
  if (!first) return '';
  return first.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const AddBusinessModal = ({ onSave }) => {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [category, setCategory] = useState('');
    const [placeId, setPlaceId] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchInputRef = useRef(null);

    const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMaps();

    const handlePlaceSelected = useCallback((placeData) => {
        setName(placeData.business_name || '');
        setCity(placeData.city || '');
        setState(placeData.state || '');
        setPlaceId(placeData.place_id || '');
        const cat = formatTypeToCategory(placeData.types);
        if (cat) setCategory(cat);
    }, []);

    usePlacesAutocomplete(searchInputRef, handlePlaceSelected, { types: ['establishment'] });

    useEffect(() => {
        if (mapsLoaded) {
            const observer = new MutationObserver(() => {
                const pac = document.querySelector('.pac-container');
                if (pac) {
                    pac.style.zIndex = '99999';
                    pac.style.position = 'absolute';
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return () => observer.disconnect();
        }
    }, [mapsLoaded]);

    const resetForm = () => {
        setName('');
        setCity('');
        setState('');
        setCategory('');
        setPlaceId('');
    };

    const handleSave = async () => {
        if (!name?.trim()) {
            toast.error('Please enter or search for a business name');
            return;
        }
        await onSave({ name: name.trim(), city, state, category, placeId: placeId || undefined });
        setIsOpen(false);
        resetForm();
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) resetForm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
            <DialogTrigger asChild>
                <Button className="bg-theme-gradient shadow-md hover:shadow-lg transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Add Business
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[520px] bg-white border-0 shadow-2xl"
                overlayClassName="pointer-events-none"
                onPointerDownOutside={(e) => {
                    if (e.target?.closest?.('.pac-container')) e.preventDefault();
                }}
                onInteractOutside={(e) => {
                    if (e.target?.closest?.('.pac-container')) e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-theme-gradient">
                        Add New Business
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Search for your business to auto-fill details, or enter manually
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-4">
                    {/* Smart Search - primary field */}
                    <div className="space-y-2">
                        <Label htmlFor="search" className="text-slate-700 font-medium flex items-center gap-2">
                            Search Business
                            {mapsLoaded && !mapsError && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">Smart Search</Badge>
                            )}
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                ref={searchInputRef}
                                id="search"
                                type="text"
                                value={name}
                                onChange={e => {
                                    setName(e.target.value);
                                    if (placeId) {
                                        setPlaceId('');
                                        setCity('');
                                        setState('');
                                        setCategory('');
                                    }
                                }}
                                placeholder={mapsLoaded ? "Type to search: e.g., Joe's Pizza Chicago" : "Business name or address"}
                                className={cn(
                                    "pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400",
                                    placeId && "border-green-300 bg-green-50/30"
                                )}
                                autoComplete="off"
                            />
                            {placeId && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                </span>
                            )}
                        </div>
                        {mapsLoaded && !mapsError && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Start typing to search Google Places — we'll auto-fill the rest
                            </p>
                        )}
                        {mapsError && (
                            <p className="text-xs text-amber-600">Manual entry only — search unavailable</p>
                        )}
                        <style>{`
                            .pac-container { z-index: 99999 !important; }
                        `}</style>
                    </div>

                    {/* Autofilled / manual fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-slate-700 font-medium">City</Label>
                            <Input 
                                id="city" 
                                value={city} 
                                onChange={e => setCity(e.target.value)}
                                placeholder="Chicago"
                                className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state" className="text-slate-700 font-medium">State</Label>
                            <Input 
                                id="state" 
                                value={state} 
                                onChange={e => setState(e.target.value)}
                                placeholder="IL"
                                className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category" className="text-slate-700 font-medium">Category</Label>
                        <Input 
                            id="category" 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            placeholder="Restaurant"
                            className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handleSave}
                        className="bg-theme-gradient shadow-md"
                    >
                        Save Business
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Circular Progress Ring
const CircularProgress = ({ value, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return "text-green-500";
    if (val >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", getColor(value))}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <span className={cn("text-xl font-bold", getColor(value))}>{value}</span>
        <span className="text-xs text-slate-500 block">score</span>
      </div>
    </div>
  );
};

// Business Card Component
const BusinessCard = ({ business, score, priority }) => {
  const priorityConfig = {
    High: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    Low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" }
  };

  const config = priorityConfig[priority] || priorityConfig.Medium;

  return (
    <Card className="group bg-white/90 backdrop-blur-sm border-0 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-slate-200 hover:border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-theme-gradient flex items-center justify-center text-white font-bold text-xl shadow-md">
              {business.name?.[0] || 'B'}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                {business.name}
              </CardTitle>
              <p className="text-sm text-slate-500">{business.city}, {business.state}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{business.category || 'Uncategorized'}</p>
            <Badge className={cn("px-3 py-1", config.bg, config.text, config.border)}>
              {priority} Priority
            </Badge>
          </div>
          <CircularProgress value={score} size={70} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <Clock className="w-3.5 h-3.5" />
          <span>Last audit: Never</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 bg-theme-gradient shadow-sm"
            asChild
          >
            <Link to={createPageUrl("GeoMeoOperator")}>
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Run Audit
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-slate-200 hover:bg-slate-50" 
            asChild
          >
            <Link to={createPageUrl(`BusinessDetail?id=${business.id}`)}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Filter Pills
const FilterPill = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full font-medium transition-all duration-200",
        active
          ? "bg-theme-gradient text-white shadow-md"
          : "bg-white/80 text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
};

// ============================================================================
// WAITLIST IMPORT MODAL
// ============================================================================

const WaitlistImportModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        setFile(selectedFile);
        setResult(null); // Clear previous results on new file selection
      } else {
        toast.error('Please upload XLSX or CSV file only');
        setFile(null); // Clear file if invalid type
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
        toast.error('No file selected for upload.');
        return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await waitlistExtractor(formData);

      if (response.status === 'ok') {
        setResult(response.data); // Assuming response.data contains the actual result
        toast.success('Waitlist imported successfully!');
      } else {
        toast.error(response.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import waitlist');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) { // Reset state when dialog is closed
            handleReset();
        }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
          <Upload className="w-4 h-4 mr-2" />
          Import Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-theme-gradient">
            Import Waitlist from Spreadsheet
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Upload XLSX or CSV file. Auto-detects headers and de-dupes by email.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-6 py-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                file ? "border-slate-400 bg-slate-50" : "border-slate-300 hover:border-slate-300"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">Click to upload</p>
                  <p className="text-sm text-slate-500">Supports XLSX, XLS, CSV</p>
                </div>
              )}
            </div>

            {file && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-theme-gradient"
              >
                {isUploading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4 mr-2" />
                        Process & Import
                    </>
                )}
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6 py-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-green-900 mb-2">Import Successful</h3>
                    <p className="text-sm text-green-700">{result.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-700">{result.stats.rows_read}</p>
                  <p className="text-xs text-slate-500">Rows Read</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.stats.rows_inserted}</p>
                  <p className="text-xs text-slate-500">Inserted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.stats.rows_updated}</p>
                  <p className="text-xs text-slate-500">Updated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.stats.total_contacts}</p>
                  <p className="text-xs text-slate-500">Total Contacts</p>
                </CardContent>
              </Card>
            </div>

            {result.preview.added.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Added/Updated Contacts ({result.preview.added.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.preview.added.map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{contact.email}</p>
                          <p className="text-xs text-slate-500">{contact.name || 'No name'}</p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 text-xs">New</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {result.preview.errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-red-700">Errors ({result.preview.errors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.preview.errors.map((error, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-red-100 rounded">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setResult(null);
                  handleReset();
                }}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                Import Another File
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MAIN BUSINESSES PAGE
// ============================================================================

export default function Businesses({ user }) {
    const [businesses, setBusinesses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [priorityFilter, setPriorityFilter] = useState('all');
    
    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        setIsLoading(true);
        const data = await Business.list();
        setBusinesses(data);
        setIsLoading(false);
    };

    const handleSaveBusiness = async (data) => {
        const businessData = { ...data, ownerId: user?.id || '1' };
        await Business.create(businessData);
        loadBusinesses();
    };

    const businessesWithScores = businesses.map(b => {
        const score = Math.floor(60 + Math.random() * 35);
        const priority = score < 70 ? 'High' : score < 85 ? 'Medium' : 'Low';
        return { ...b, score, priority };
    });

    const filteredBusinesses = businessesWithScores.filter(b => {
        const searchMatch = (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        const priorityMatch = priorityFilter === 'all' || b.priority === priorityFilter;
        return searchMatch && priorityMatch;
    });

    const canAddBusiness = user?.plan !== 'FREE';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-white">
            <div className="max-w-7xl mx-auto p-6 space-y-6" data-onboard="businesses">
                {/* Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-theme-gradient flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-theme-gradient flex items-center justify-center">
                                <Building className="w-6 h-6 text-white" />
                            </div>
                            Businesses
                        </h1>
                        <p className="text-slate-600 mt-2 text-lg">Manage and track your local business listings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 bg-white/80 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    viewMode === 'grid'
                                        ? "bg-slate-100 text-slate-700"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Grid3x3 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    viewMode === 'list'
                                        ? "bg-slate-100 text-slate-700"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                        <WaitlistImportModal />
                        {canAddBusiness ? (
                            <AddBusinessModal onSave={handleSaveBusiness} />
                        ) : (
                            <Button asChild className="bg-theme-gradient">
                                <Link to={createPageUrl("pricing")}>Upgrade to Add</Link>
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Filters */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    placeholder="Search businesses..." 
                                    className="pl-12 h-12 bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <FilterPill
                                    label="All"
                                    active={priorityFilter === 'all'}
                                    onClick={() => setPriorityFilter('all')}
                                />
                                <FilterPill
                                    label="High Priority"
                                    active={priorityFilter === 'High'}
                                    onClick={() => setPriorityFilter('High')}
                                />
                                <FilterPill
                                    label="Medium"
                                    active={priorityFilter === 'Medium'}
                                    onClick={() => setPriorityFilter('Medium')}
                                />
                                <FilterPill
                                    label="Low"
                                    active={priorityFilter === 'Low'}
                                    onClick={() => setPriorityFilter('Low')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            
                {/* Business Grid/List */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBusinesses.map((business) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                score={business.score}
                                priority={business.priority}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {filteredBusinesses.map((business) => (
                                    <div key={business.id} className="flex items-center justify-between p-4 rounded-xl bg-white/80 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center text-white font-bold text-lg">
                                                {business.name?.[0] || 'B'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{business.name}</p>
                                                <p className="text-sm text-slate-500">{business.city}, {business.state}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <CircularProgress value={business.score} size={60} strokeWidth={6} />
                                            <Button size="sm" className="bg-theme-gradient">
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && filteredBusinesses.length === 0 && (
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="py-16">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                                    <Building className="w-10 h-10 text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">No businesses found</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    {businesses.length === 0 
                                        ? "Get started by adding your first business location." 
                                        : "Try adjusting your search filters."}
                                </p>
                                {businesses.length === 0 && canAddBusiness && (
                                    <AddBusinessModal onSave={handleSaveBusiness} />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
