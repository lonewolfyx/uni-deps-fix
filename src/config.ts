import type { ParsedArgs } from 'citty'
import type { commandArgs } from '@/args.ts'
import type { IResolveConfig } from '@/types'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type CommandArgs = ParsedArgs<typeof commandArgs>

const defaultConfig = {
    cwd: process.cwd(),
    templatePath: resolve(dirname(fileURLToPath(import.meta.url)), '../'),
    dependencies: {},
    devDependencies: {},
}

export const resolveConfig = async (options: Partial<CommandArgs>): Promise<IResolveConfig> => {
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
