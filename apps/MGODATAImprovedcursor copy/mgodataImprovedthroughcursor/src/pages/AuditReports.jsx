import React, { useState, useEffect, useMemo } from 'react';
import { AuditReport, AuditTask, Business } from '@/api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, Grid3x3, List, ClipboardCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportCard from '../components/audits/ReportCard';
import TasksView from '../components/audits/TasksView';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const PageHeader = ({ title, subtitle }) => (
    <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg mb-4">
            <ClipboardCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">{title}</h1>
        {subtitle && <p className="text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
);

export default function AuditReportsPage({ user }) {
    const [reports, setReports] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [reportsData, tasksData, businessesData] = await Promise.all([
                AuditReport.list('-occurredAt'),
                AuditTask.list(),
                Business.list()
            ]);
            setReports(reportsData || []);
            setTasks(tasksData || []);
            setBusinesses(businessesData || []);
            setIsLoading(false);
        };
        loadData();
    }, []);

    const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

    // Enhance reports with status and category
    const enhancedReports = useMemo(() => {
        return reports.map(report => {
            const relatedTasks = tasks.filter(t => t.reportId === report.id);
            const completedTasks = relatedTasks.filter(t => t.done).length;
            const totalTasks = relatedTasks.length;
            
            let status = 'Completed';
            if (totalTasks === 0) {
                status = 'Pending';
            } else if (completedTasks < totalTasks) {
                status = 'In Progress';
            }

            // Determine category based on title
            let category = 'General';
            const titleLower = (report.title || '').toLowerCase();
            if (titleLower.includes('onboard') || titleLower.includes('setup')) {
                category = 'Onboarding';
            } else if (titleLower.includes('maps') || titleLower.includes('gbp') || titleLower.includes('google')) {
                category = 'Google Maps';
            } else if (titleLower.includes('review') || titleLower.includes('rating')) {
                category = 'Reviews';
            } else if (titleLower.includes('ai') || titleLower.includes('visibility')) {
                category = 'AI Visibility';
            }

            return {
                ...report,
                status,
                category,
                completedTasks,
                totalTasks,
                metrics: {
                    visibility: report.score || 0,
                    reviewVelocity: Math.floor(Math.random() * 30) + 5, // Mock data
                    meoScore: Math.floor(Math.random() * 40) + 60 // Mock data
                }
            };
        });
    }, [reports, tasks]);

    const filteredReports = useMemo(() => {
        return enhancedReports.filter(report => {
            const searchMatch = 
                ((report.title || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                ((report.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                ((businessMap.get(report.businessId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
            
            const statusMatch = statusFilter === 'all' || report.status === statusFilter;
            const categoryMatch = categoryFilter === 'all' || report.category === categoryFilter;
            
            return searchMatch && statusMatch && categoryMatch;
        });
    }, [enhancedReports, searchTerm, statusFilter, categoryFilter, businessMap]);

    const handleTaskUpdate = async (taskId, newDoneState) => {
        await AuditTask.update(taskId, { done: newDoneState });
        const tasksData = await AuditTask.list();
        setTasks(tasksData);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
            <div className="max-w-7xl mx-auto px-6 py-8" data-onboard="reports">
                <PageHeader 
                    title="Audit Reports" 
                    subtitle="Track performance and uncover growth opportunities" 
                />

                <Tabs defaultValue="reports" className="w-full space-y-6">
                    {/* Tab Navigation */}
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-2">
                        <TabsList className="grid grid-cols-2 w-full bg-transparent gap-2">
                            <TabsTrigger 
                                value="reports"
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl h-12 font-semibold transition-all"
                            >
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Reports
                            </TabsTrigger>
                            <TabsTrigger 
                                value="tasks"
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl h-12 font-semibold transition-all"
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Tasks
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    placeholder="Search reports or businesses..."
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 rounded-xl"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full lg:w-[180px] h-12 bg-slate-50 border-slate-200 rounded-xl">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full lg:w-[180px] h-12 bg-slate-50 border-slate-200 rounded-xl">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                                    <SelectItem value="Google Maps">Google Maps</SelectItem>
                                    <SelectItem value="Reviews">Reviews</SelectItem>
                                    <SelectItem value="AI Visibility">AI Visibility</SelectItem>
                                    <SelectItem value="General">General</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* View Toggle */}
                            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "w-10 h-10 rounded-lg transition-all",
                                        viewMode === 'grid' && "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md"
                                    )}
                                >
                                    <Grid3x3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "w-10 h-10 rounded-lg transition-all",
                                        viewMode === 'list' && "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <TabsContent value="reports" className="mt-0">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(isLoading ? Array(6).fill(null) : filteredReports).map((report, i) =>
                                    isLoading ? (
                                        <Skeleton key={i} className="h-80 w-full rounded-2xl" />
                                    ) : (
                                        <ReportCard
                                            key={report.id}
                                            report={report}
                                            business={businessMap.get(report.businessId)}
                                        />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(isLoading ? Array(6).fill(null) : filteredReports).map((report, i) =>
                                    isLoading ? (
                                        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                                    ) : (
                                        <ReportCard
                                            key={report.id}
                                            report={report}
                                            business={businessMap.get(report.businessId)}
                                            viewMode="list"
                                        />
                                    )
                                )}
                            </div>
                        )}

                        {!isLoading && filteredReports.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                                    <ClipboardCheck className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">No reports found</h3>
                                <p className="text-slate-500 mb-4">
                                    {reports.length === 0 
                                        ? "Create your first audit report to start tracking performance."
                                        : "Try adjusting your search or filters."}
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tasks" className="mt-0">
                        <TasksView
                            tasks={tasks}
                            reports={reports}
                            businesses={businesses}
                            isLoading={isLoading}
                            onTaskUpdate={handleTaskUpdate}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}