import { describe, it } from 'vitest'
import { resolveConfig } from '@/config.ts'

describe('config', () => {
    it('resolve config', async () => {
        const config = await resolveConfig({})
        console.log(config)
    })
})
