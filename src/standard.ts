import type { IResolveConfig } from './types'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { downloadTemplate } from 'giget'

export const downloadStandardUniAppTemplate = async (config: IResolveConfig) => {
    const templatePath = resolve(config.templatePath, 'temp')

    if (!existsSync(templatePath)) {
        await mkdir(templatePath, {
            recursive: true,
        })
    }

    await downloadTemplate('github:feige996/unibest', {
        cwd: templatePath,
        dir: 'unibest',
    })

    await downloadTemplate('github:uni-helper/vitesse-uni-app', {
        cwd: templatePath,
        dir: 'vitesse-uni-app',
    })
}
