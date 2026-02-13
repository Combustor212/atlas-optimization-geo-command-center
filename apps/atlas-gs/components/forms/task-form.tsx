'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createWorkItem, updateWorkItem, TASK_TEMPLATES } from '@/app/actions/tasks'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TaskFormProps {
  task?: any
  businesses: any[]
  contracts: any[]
  users: any[]
}

const CATEGORY_OPTIONS = [
  { value: 'ALL_SERVICES', label: 'All Services (SEO, GEO, MEO, CRM, Website)' },
  { value: 'SEO', label: 'SEO' },
  { value: 'GEO', label: 'GEO' },
  { value: 'MEO', label: 'MEO' },
  { value: 'CRM', label: 'CRM' },
  { value: 'WEBSITE', label: 'Build a Website' },
]

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DONE', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

export function TaskForm({ task, businesses, contracts, users }: TaskFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [businessId, setBusinessId] = useState(task?.businessId || '')
  const [contractId, setContractId] = useState(task?.contractId || 'NONE')
  const [category, setCategory] = useState(task?.category || 'SEO')
  const [status, setStatus] = useState(task?.status || 'TODO')
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM')
  const [assignedToUserId, setAssignedToUserId] = useState(task?.assignedToUserId || 'UNASSIGNED')
  const [template, setTemplate] = useState('')

  // Filter contracts by selected business
  const filteredContracts = contracts.filter(c => c.businessId === businessId)

  function applyTemplate(templateKey: string) {
    const template = TASK_TEMPLATES[templateKey as keyof typeof TASK_TEMPLATES]
    if (!template) return

    const titleInput = document.getElementById('title') as HTMLInputElement
    const descriptionInput = document.getElementById('description') as HTMLTextAreaElement
    const checklistInput = document.getElementById('checklist') as HTMLTextAreaElement

    if (titleInput) titleInput.value = template.title
    if (descriptionInput) descriptionInput.value = template.description
    if (checklistInput) checklistInput.value = JSON.stringify(template.checklist, null, 2)
    
    setCategory(template.category)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      const data = {
        businessId,
        contractId: contractId === 'NONE' ? undefined : contractId,
        title: formData.get('title') as string,
        category,
        description: formData.get('description') as string || undefined,
        status,
        priority,
        dueDate: formData.get('dueDate') as string || undefined,
        assignedToUserId: assignedToUserId === 'UNASSIGNED' ? undefined : assignedToUserId,
        checklist: formData.get('checklist') as string || undefined,
      }

      if (task) {
        await updateWorkItem(task.id, data)
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        })
      } else {
        await createWorkItem(data)
        toast({
          title: 'Success',
          description: 'Task created successfully',
        })
      }

      router.push('/tasks')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!task && (
        <Card>
          <CardHeader>
            <CardTitle>Use a Template (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="default"
                onClick={() => applyTemplate('all-services-onboarding')}
              >
                All Services Package
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate('seo-monthly')}
              >
                SEO Monthly Report
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate('geo-citations')}
              >
                Build Local Citations
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate('meo-weekly-post')}
              >
                Weekly GBP Post
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate('crm-setup')}
              >
                CRM Setup
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => applyTemplate('website-build')}
              >
                Build Website
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessId">Business *</Label>
          <Select value={businessId} onValueChange={setBusinessId} required disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractId">Related Contract (Optional)</Label>
          <Select value={contractId} onValueChange={setContractId} disabled={loading || !businessId}>
            <SelectTrigger>
              <SelectValue placeholder="Select contract" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {filteredContracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            name="title"
            defaultValue={task?.title}
            required
            disabled={loading}
            placeholder="e.g., Create monthly SEO report"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={setCategory} required disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select value={status} onValueChange={setStatus} required disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select value={priority} onValueChange={setPriority} required disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedToUserId">Assigned To</Label>
          <Select value={assignedToUserId} onValueChange={setAssignedToUserId} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
            disabled={loading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={task?.description}
            disabled={loading}
            rows={3}
            placeholder="Add task details..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="checklist">Checklist (JSON format - optional)</Label>
          <Textarea
            id="checklist"
            name="checklist"
            defaultValue={task?.checklist}
            disabled={loading}
            rows={5}
            placeholder='[{"text": "Step 1", "done": false}, {"text": "Step 2", "done": false}]'
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/tasks')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
