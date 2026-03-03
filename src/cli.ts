import { createMain, defineCommand } from 'citty'
import { commandArgs } from '@/args.ts'
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
    run({ args }) {
        console.log(args)
    },
})

createMain(command)({})
