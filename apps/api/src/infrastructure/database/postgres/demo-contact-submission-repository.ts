import type { PrismaClient } from '@prisma/client'
import type { DemoContactSubmissionRecord, DemoContactSubmissionRepository } from '../../../domain/repositories/agronautas'
import { getPrismaClient } from '../prisma/client'

export class PostgresDemoContactSubmissionRepository implements DemoContactSubmissionRepository {
  constructor(private readonly prisma?: Pick<PrismaClient, '$queryRawUnsafe'>) {}

  async save(record: DemoContactSubmissionRecord): Promise<{ submissionId: string }> {
    const client = this.prisma ?? getPrismaClient()
    const rows = await client.$queryRawUnsafe(
      `INSERT INTO demo_contact_submissions (
        name, email, phone, organization, role, hectares_range, locality, message, source_path, user_agent, ip_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id`,
      record.name,
      record.email,
      record.phone ?? null,
      record.organization ?? null,
      record.role ?? null,
      record.hectaresRange ?? null,
      record.locality ?? null,
      record.message ?? null,
      record.sourcePath,
      record.userAgent ?? null,
      record.ipHash ?? null,
    ) as Array<{ id: string }>

    const submissionId = rows[0]?.id
    if (!submissionId) {
      throw new Error('demo_contact_submission_not_persisted')
    }

    return { submissionId }
  }
}
