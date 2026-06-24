import { GovernmentDetail } from '@/components/government/detail'

type PageProps = { params: Promise<{ id: string }> }

export default async function MunicipalityDetailPage({ params }: PageProps) {
  const { id } = await params
  return <GovernmentDetail municipalityId={id} />
}
