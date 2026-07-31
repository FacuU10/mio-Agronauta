import { AgronautasFieldDetailPageClient } from '@/components/agronautas/field-detail'

export default async function AgronautasFieldDetailRoute({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = await params
  return <AgronautasFieldDetailPageClient fieldId={fieldId} />
}
