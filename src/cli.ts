import { spinner } from '@clack/prompts'
import { createMain, defineCommand } from 'citty'
import { commandArgs } from '@/args.ts'
import { resolveConfig } from '@/config.ts'
import { downloadStandardUniAppTemplate } from '@/standard.ts'
import { description, name, version } from '../package.json'

const command = defineCommand({
    meta: {
        name,
        version,
        description,
    },
    setup() {
        console.log('Setup')
    },
    cleanup() {
        console.log('Cleanup')
    },
    args: commandArgs,
    async run({ args }) {
        const config = await resolveConfig(args)
        const s = spinner()

        s.start('正在收集最新的项目依赖')
        await downloadStandardUniAppTemplate(config)
        s.stop('')
        console.log(config)
    },
})

createMain(command)({})
