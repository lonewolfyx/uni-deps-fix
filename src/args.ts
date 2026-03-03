export const commandArgs = {
    cwd: {
        type: 'string',
        description: 'Current working directory',
        alias: 'c',
        default: process.cwd(),
    },
} as const
