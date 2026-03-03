import type { ParsedArgs } from 'citty'
import type { commandArgs } from '@/args.ts'
import type { IOptions } from '@/types'

type CommandArgs = ParsedArgs<typeof commandArgs>

const defaultConfig = {
    cwd: process.cwd(),
    dependencies: {},
    devDependencies: {},
}

export const resolveConfig = async (options: Partial<CommandArgs>): Promise<IOptions> => {
    const { loadConfig } = await import('c12')

    const { config } = await loadConfig({
        name: 'uni-package-config',
        defaults: defaultConfig,
        overrides: {
            ...defaultConfig,
            ...options,
        },
    })

    return config
}
