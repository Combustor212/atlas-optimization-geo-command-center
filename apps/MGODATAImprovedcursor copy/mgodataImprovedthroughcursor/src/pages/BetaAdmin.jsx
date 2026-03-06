import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, Users, Mail, Calendar, CreditCard } from 'lucide-react';
import { WaitlistEntry } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import StripeSettings from '@/components/admin/StripeSettings';

export default function BetaAdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('waitlist');
  const [stats, setStats] = useState({ remaining: 294, claimed: 0, cap: 300 });

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['waitlist-entries'],
    queryFn: async () => {
      try {
        const data = await WaitlistEntry.filter({}, '-created_date', 100);
        return data || [];
      } catch (err) {
        console.error('Failed to fetch entries:', err);
        return [];
      }
    },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/functions/betaRemaining', { cache: 'no-store' });
        const json = await res.json();
        setStats({
          remaining: json.remaining || 294,
          claimed: json.claimed || 0,
          cap: json.cap || 300
        });
      } catch (err) {
        console.warn('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [entries]);

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csv = [
      ['Email', 'Joined At', 'Country', 'Source', 'Status'],
      ...entries.map(e => [
        e.email,
        format(new Date(e.created_date), 'yyyy-MM-dd HH:mm:ss'),
        e.country || '',
        e.source || 'beta-landing',
        e.status || 'joined'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    toast.success('Export downloaded');
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
            <p className="text-slate-600">Manage beta signups and billing configuration</p>
          </div>
          
          {activeTab === 'waitlist' && (
            <div className="flex gap-3">
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExportCSV} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="waitlist" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Waitlist
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Stripe Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waitlist"  className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Claimed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.claimed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Remaining Spots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.remaining}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.cap}</div>
            </CardContent>
          </Card>
        </div>

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Recent Signups ({entries?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : entries && entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Joined At</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Country</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">{entry.email}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(entry.created_date), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{entry.country || '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{entry.source || 'beta-landing'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            {entry.status || 'joined'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">No signups yet</div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="billing">
            <StripeSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}