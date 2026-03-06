import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2 } from 'lucide-react';

export default function TasksView({ tasks, reports, businesses, isLoading, onTaskUpdate }) {
    const reportMap = useMemo(() => new Map(reports.map(r => [r.id, r])), [reports]);
    const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

    const tasksByReport = useMemo(() => {
        return tasks.reduce((acc, task) => {
            const report = reportMap.get(task.reportId);
            if (!report) return acc;

            if (!acc[task.reportId]) {
                acc[task.reportId] = {
                    report,
                    tasks: [],
                };
            }
            acc[task.reportId].tasks.push(task);
            return acc;
        }, {});
    }, [tasks, reportMap]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg p-4">
            <Accordion type="multiple" defaultValue={Object.keys(tasksByReport).slice(0, 1)} className="w-full space-y-3">
                {Object.values(tasksByReport).map(({ report, tasks }) => {
                    const business = businessMap.get(report.businessId);
                    const completedTasks = tasks.filter(t => t.done).length;
                    const totalTasks = tasks.length;
                    return (
                        <AccordionItem key={report.id} value={report.id} className="border border-slate-200/80 rounded-xl bg-white/70 px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                        <h3 className="font-semibold text-slate-800">{report.title}</h3>
                                        <p className="text-sm text-slate-500">{business?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <CheckCircle2 className={`w-5 h-5 ${completedTasks === totalTasks ? 'text-green-500' : 'text-slate-400'}`} />
                                        <span>{completedTasks} / {totalTasks} Tasks</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-1">
                                <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-200/50">
                                            <Checkbox
                                                id={`task-${task.id}`}
                                                checked={task.done}
                                                onCheckedChange={(checked) => onTaskUpdate(task.id, checked)}
                                                className="mt-1"
                                            />
                                            <label htmlFor={`task-${task.id}`} className="flex-1">
                                                <p className={`font-medium ${task.done ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                                    {task.title}
                                                </p>
                                                {task.description && <p className="text-sm text-slate-500">{task.description}</p>}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </Card>
    );
}