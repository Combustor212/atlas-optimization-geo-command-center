import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { BusinessForm } from '@/components/forms/business-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditBusinessPage({
  params,
}: {
  params: { id: string }
}) {
  const business = await prisma.business.findUnique({
    where: { id: params.id },
  })

  if (!business) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/businesses/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Business
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Business</h1>
        <p className="text-slate-500 mt-1">Update business information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessForm business={business} />
        </CardContent>
      </Card>
    </div>
  )
}

