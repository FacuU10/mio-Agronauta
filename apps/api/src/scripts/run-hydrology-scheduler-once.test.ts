import test from 'node:test'
import assert from 'node:assert/strict'
import { getHydrologyCronConfig } from './run-hydrology-scheduler-once'

test('authenticated hydrology Cron requires the configured token and fixed owner', () => {
  assert.deepEqual(getHydrologyCronConfig({ HYDROLOGY_INGEST_TOKEN: 'cron-secret', HYDROLOGY_CRON_OWNER_ID: 'ibera-hydrology-cron' }), {
    token: 'cron-secret',
    ownerId: 'ibera-hydrology-cron',
  })
  assert.throws(() => getHydrologyCronConfig({ HYDROLOGY_CRON_OWNER_ID: 'ibera-hydrology-cron' }), /HYDROLOGY_INGEST_TOKEN/)
  assert.throws(() => getHydrologyCronConfig({ HYDROLOGY_INGEST_TOKEN: 'cron-secret' }), /HYDROLOGY_CRON_OWNER_ID/)
})
