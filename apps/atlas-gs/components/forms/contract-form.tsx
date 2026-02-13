'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createContract, updateContract } from '@/app/actions/contracts'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContractFormProps {
  contract?: any
  businesses: any[]
  deals: any[]
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELED', label: 'Canceled' },
]

export function ContractForm({ contract, businesses, deals }: ContractFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [businessId, setBusinessId] = useState(contract?.businessId || '')
  const [dealId, setDealId] = useState(contract?.dealId || 'NONE')
  const [status, setStatus] = useState(contract?.status || 'DRAFT')
  const [autoRenew, setAutoRenew] = useState(contract?.autoRenew || false)
  
  // Services
  const [serviceSEO, setServiceSEO] = useState(contract?.serviceSEO || false)
  const [serviceGEO, setServiceGEO] = useState(contract?.serviceGEO || false)
  const [serviceMEO, setServiceMEO] = useState(contract?.serviceMEO || false)
  const [serviceCRM, setServiceCRM] = useState(contract?.serviceCRM || false)
  const [serviceWEBSITE, setServiceWEBSITE] = useState(contract?.serviceWEBSITE || false)

  // Filter deals by selected business
  const filteredDeals = deals.filter(d => d.businessId === businessId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      const data = {
        businessId,
        dealId: dealId === 'NONE' ? undefined : dealId,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        termMonths: parseInt(formData.get('termMonths') as string),
        autoRenew,
        renewalNoticeDays: parseInt(formData.get('renewalNoticeDays') as string) || 30,
        status,
        mrr: Math.round(parseFloat(formData.get('mrr') as string || '0') * 100), // Convert to cents
        setupFee: Math.round(parseFloat(formData.get('setupFee') as string || '0') * 100), // Convert to cents
        serviceSEO,
        serviceGEO,
        serviceMEO,
        serviceCRM,
        serviceWEBSITE,
        notes: formData.get('notes') as string || undefined,
      }

      if (contract) {
        await updateContract(contract.id, data)
        toast({
          title: 'Success',
          description: 'Contract updated successfully',
        })
      } else {
        await createContract(data)
        toast({
          title: 'Success',
          description: 'Contract created successfully',
        })
      }

      router.push('/contracts')
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
          <Label htmlFor="dealId">Related Deal (Optional)</Label>
          <Select value={dealId} onValueChange={setDealId} disabled={loading || !businessId}>
            <SelectTrigger>
              <SelectValue placeholder="Select deal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {filteredDeals.map((deal) => (
                <SelectItem key={deal.id} value={deal.id}>
                  {deal.stage} - ${(deal.expectedMrr || 0) / 100}/mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={contract?.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : ''}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={contract?.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : ''}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="termMonths">Term (Months) *</Label>
          <Input
            id="termMonths"
            name="termMonths"
            type="number"
            defaultValue={contract?.termMonths || 12}
            required
            disabled={loading}
            min="1"
          />
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
          <Label htmlFor="mrr">Monthly Recurring Revenue ($) *</Label>
          <Input
            id="mrr"
            name="mrr"
            type="number"
            step="0.01"
            defaultValue={contract?.mrr ? (contract.mrr / 100).toFixed(2) : '0.00'}
            required
            disabled={loading}
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setupFee">Setup Fee ($)</Label>
          <Input
            id="setupFee"
            name="setupFee"
            type="number"
            step="0.01"
            defaultValue={contract?.setupFee ? (contract.setupFee / 100).toFixed(2) : '0.00'}
            disabled={loading}
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="renewalNoticeDays">Renewal Notice (Days)</Label>
          <Input
            id="renewalNoticeDays"
            name="renewalNoticeDays"
            type="number"
            defaultValue={contract?.renewalNoticeDays || 30}
            disabled={loading}
            min="0"
          />
        </div>

        <div className="space-y-2 flex items-center gap-2 pt-8">
          <Checkbox
            id="autoRenew"
            checked={autoRenew}
            onCheckedChange={(checked) => setAutoRenew(checked as boolean)}
            disabled={loading}
          />
          <Label htmlFor="autoRenew" className="cursor-pointer">
            Auto-Renew Contract
          </Label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services Included *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="serviceSEO"
                checked={serviceSEO}
                onCheckedChange={(checked) => setServiceSEO(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="serviceSEO" className="cursor-pointer">
                SEO
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="serviceGEO"
                checked={serviceGEO}
                onCheckedChange={(checked) => setServiceGEO(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="serviceGEO" className="cursor-pointer">
                GEO
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="serviceMEO"
                checked={serviceMEO}
                onCheckedChange={(checked) => setServiceMEO(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="serviceMEO" className="cursor-pointer">
                MEO
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="serviceCRM"
                checked={serviceCRM}
                onCheckedChange={(checked) => setServiceCRM(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="serviceCRM" className="cursor-pointer">
                CRM
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="serviceWEBSITE"
                checked={serviceWEBSITE}
                onCheckedChange={(checked) => setServiceWEBSITE(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="serviceWEBSITE" className="cursor-pointer">
                Website
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={contract?.notes}
          disabled={loading}
          rows={3}
          placeholder="Additional contract notes..."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : contract ? 'Update Contract' : 'Create Contract'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/contracts')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
