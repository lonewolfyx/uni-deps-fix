import { createMain, defineCommand } from 'citty'
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
    args: {
        cwd: {
            type: 'string',
            description: 'Current working directory',
            alias: 'c',
            default: process.cwd(),
        },
    },
    subCommands: {
        build: () => import('./commands/build.ts').then(r => r.default),
    },
    run({ args }) {
        console.log(args)
    },
})

createMain(command)({})
