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
import { createInvoice, updateInvoice } from '@/app/actions/invoices'
import { useToast } from '@/components/ui/use-toast'

interface InvoiceFormProps {
  invoice?: any
  businesses: any[]
  contracts: any[]
  invoiceNumber?: string
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOID', label: 'Void' },
]

export function InvoiceForm({ invoice, businesses, contracts, invoiceNumber }: InvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [businessId, setBusinessId] = useState(invoice?.businessId || '')
  const [contractId, setContractId] = useState(invoice?.contractId || 'NONE')
  const [status, setStatus] = useState(invoice?.status || 'DRAFT')

  // Filter contracts by selected business
  const filteredContracts = contracts.filter(c => c.businessId === businessId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      const data = {
        businessId,
        contractId: contractId === 'NONE' ? undefined : contractId,
        invoiceNumber: formData.get('invoiceNumber') as string,
        issueDate: formData.get('issueDate') as string,
        dueDate: formData.get('dueDate') as string,
        amountCents: Math.round(parseFloat(formData.get('amount') as string || '0') * 100), // Convert to cents
        currency: 'USD',
        status,
        paymentLink: formData.get('paymentLink') as string || undefined,
        notes: formData.get('notes') as string || undefined,
      }

      if (invoice) {
        await updateInvoice(invoice.id, data)
        toast({
          title: 'Success',
          description: 'Invoice updated successfully',
        })
      } else {
        await createInvoice(data)
        toast({
          title: 'Success',
          description: 'Invoice created successfully',
        })
      }

      router.push('/invoices')
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
          <Label htmlFor="contractId">Related Contract (Optional)</Label>
          <Select value={contractId} onValueChange={setContractId} disabled={loading || !businessId}>
            <SelectTrigger>
              <SelectValue placeholder="Select contract" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {filteredContracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  ${(contract.mrr / 100).toFixed(2)}/mo - {new Date(contract.startDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            defaultValue={invoice?.invoiceNumber || invoiceNumber}
            required
            disabled={loading}
            placeholder="INV-2026-0001"
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
          <Label htmlFor="issueDate">Issue Date *</Label>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={invoice?.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            defaultValue={invoice?.amountCents ? (invoice.amountCents / 100).toFixed(2) : '0.00'}
            required
            disabled={loading}
            min="0"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentLink">Payment Link</Label>
          <Input
            id="paymentLink"
            name="paymentLink"
            type="url"
            defaultValue={invoice?.paymentLink}
            disabled={loading}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={invoice?.notes}
            disabled={loading}
            rows={3}
            placeholder="Additional invoice notes..."
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/invoices')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
