'use client'

import { useState } from 'react'
import { DealStage } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { updateDealStage } from '@/app/actions/deals'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

const STAGES: DealStage[] = ['LEAD', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

interface Deal {
  id: string
  stage: DealStage
  expectedMrr: number | null
  expectedSetupFee: number | null
  business: {
    id: string
    name: string
  }
  notes: string | null
}

interface DealsPipelineProps {
  deals: Deal[]
}

export function DealsPipeline({ deals }: DealsPipelineProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleStageChange(dealId: string, newStage: DealStage) {
    setLoading(dealId)
    try {
      await updateDealStage(dealId, newStage)
      toast({
        title: 'Success',
        description: 'Deal stage updated',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deal',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  function getDealsByStage(stage: DealStage) {
    return deals.filter((deal) => deal.stage === stage)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {STAGES.map((stage) => {
        const stageDeals = getDealsByStage(stage)
        return (
          <Card key={stage} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {stage}
                <Badge variant="outline" className="ml-2">
                  {stageDeals.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              {stageDeals.map((deal) => (
                <Card key={deal.id} className="p-3 border-l-4 border-l-blue-500">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{deal.business.name}</div>
                    {deal.expectedMrr && (
                      <div className="text-xs text-muted-foreground">
                        MRR: {formatCurrency(deal.expectedMrr)}
                      </div>
                    )}
                    {deal.notes && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {deal.notes}
                      </div>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {STAGES.filter((s) => s !== stage).map((targetStage) => (
                        <Button
                          key={targetStage}
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => handleStageChange(deal.id, targetStage)}
                          disabled={loading === deal.id}
                        >
                          → {targetStage}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

