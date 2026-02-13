import { BusinessForm } from '@/components/forms/business-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewBusinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/businesses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Businesses
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">New Business</h1>
        <p className="text-slate-500 mt-1">Add a new client business</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessForm />
        </CardContent>
      </Card>
    </div>
  )
}

