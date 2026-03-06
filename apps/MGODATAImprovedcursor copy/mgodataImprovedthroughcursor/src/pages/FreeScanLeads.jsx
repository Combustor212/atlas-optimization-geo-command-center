import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  Mail,
  MapPin,
  Phone,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Eye,
  Send,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export default function FreeScanLeadsPage({ user }) {
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/free-scan-leads`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.submissions) {
        setSubmissions(data.submissions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/free-scan-leads/${id}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.id) {
        setSelectedSubmission(data);
        setDetailsOpen(true);
      }
    } catch (error) {
      console.error('Failed to load details:', error);
      toast.error('Failed to load lead details');
    }
  };

  const handleRetryEmail = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/free-scan-leads/${id}/retry-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Email retry initiated');
        loadSubmissions();
      } else {
        toast.error(data.message || 'Failed to retry email');
      }
    } catch (error) {
      console.error('Failed to retry email:', error);
      toast.error('Failed to retry email');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      sent: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Sent' },
      pending: { icon: Clock, className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      retry: { icon: RefreshCw, className: 'bg-orange-100 text-orange-700', label: 'Retrying' },
      failed: { icon: AlertTriangle, className: 'bg-red-100 text-red-700', label: 'Failed' },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-600">You need admin access to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Free Scan Leads</h1>
            <p className="text-slate-600">Monitor and manage free scan submissions</p>
          </div>

          <Button onClick={loadSubmissions} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Emails Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.sent}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.today}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Recent Submissions ({submissions.length})
            </CardTitle>
            <CardDescription>
              All emails are sent to info@atlasgrowths.com. No emails are sent to users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !submissions.length ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Business</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Location</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Scores</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Submitted</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{sub.businessName || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {sub.city && sub.state ? `${sub.city}, ${sub.state}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {sub.email && (
                            <div className="flex items-center gap-1 mb-1">
                              <Mail className="w-3 h-3" />
                              {sub.email}
                            </div>
                          )}
                          {sub.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {sub.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {sub.meoScore !== undefined && (
                            <div>MEO: {Math.round(sub.meoScore)}</div>
                          )}
                          {sub.geoScore !== undefined && (
                            <div>GEO: {Math.round(sub.geoScore)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(sub.email_status)}
                          {sub.email_retry_count > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                              Retries: {sub.email_retry_count}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(sub.created_at), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sub.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {['failed', 'retry'].includes(sub.email_status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetryEmail(sub.id)}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">No submissions yet</div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription>
                Full information for {selectedSubmission?.form_data?.businessName}
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Business Information</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedSubmission.form_data.businessName}</div>
                    <div><strong>Address:</strong> {selectedSubmission.form_data.address || 'N/A'}</div>
                    <div><strong>City:</strong> {selectedSubmission.form_data.city}</div>
                    <div><strong>State:</strong> {selectedSubmission.form_data.state}</div>
                    <div><strong>Country:</strong> {selectedSubmission.form_data.country}</div>
                    {selectedSubmission.form_data.website && (
                      <div><strong>Website:</strong> <a href={selectedSubmission.form_data.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{selectedSubmission.form_data.website}</a></div>
                    )}
                    {selectedSubmission.form_data.placeId && (
                      <div><strong>Place ID:</strong> <code className="bg-slate-200 px-2 py-1 rounded">{selectedSubmission.form_data.placeId}</code></div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Contact Information</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Email:</strong> {selectedSubmission.form_data.email || 'Not provided'}</div>
                    <div><strong>Phone:</strong> {selectedSubmission.form_data.phone || 'Not provided'}</div>
                  </div>
                </div>

                {(selectedSubmission.form_data.meoScore !== undefined || selectedSubmission.form_data.geoScore !== undefined) && (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700 mb-2">Scan Results</h3>
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                      {selectedSubmission.form_data.meoScore !== undefined && (
                        <div><strong>MEO Score:</strong> {Math.round(selectedSubmission.form_data.meoScore)}</div>
                      )}
                      {selectedSubmission.form_data.geoScore !== undefined && (
                        <div><strong>GEO Score:</strong> {Math.round(selectedSubmission.form_data.geoScore)}</div>
                      )}
                      {selectedSubmission.form_data.overallScore !== undefined && (
                        <div><strong>Overall Score:</strong> {Math.round(selectedSubmission.form_data.overallScore)}</div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Email Status</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> {getStatusBadge(selectedSubmission.email_status)}
                    </div>
                    {selectedSubmission.email_sent_at && (
                      <div><strong>Sent At:</strong> {format(new Date(selectedSubmission.email_sent_at), 'MMM d, yyyy h:mm:ss a')}</div>
                    )}
                    <div><strong>Retry Count:</strong> {selectedSubmission.email_retry_count}</div>
                    {selectedSubmission.email_error && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Error:</strong> {selectedSubmission.email_error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Metadata</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Submitted:</strong> {format(new Date(selectedSubmission.created_at), 'MMM d, yyyy h:mm:ss a')}</div>
                    {selectedSubmission.metadata.referrer && (
                      <div><strong>Referrer:</strong> {selectedSubmission.metadata.referrer}</div>
                    )}
                    {selectedSubmission.metadata.landingPath && (
                      <div><strong>Landing Page:</strong> {selectedSubmission.metadata.landingPath}</div>
                    )}
                    {selectedSubmission.metadata.utmSource && (
                      <div><strong>UTM Source:</strong> {selectedSubmission.metadata.utmSource}</div>
                    )}
                    {selectedSubmission.metadata.utmCampaign && (
                      <div><strong>UTM Campaign:</strong> {selectedSubmission.metadata.utmCampaign}</div>
                    )}
                    <div><strong>Submission ID:</strong> <code className="bg-slate-200 px-2 py-1 rounded text-xs">{selectedSubmission.id}</code></div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}



