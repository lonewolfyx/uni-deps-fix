import { rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { cancel, confirm, isCancel, note, outro, spinner } from '@clack/prompts'
import { createMain, defineCommand } from 'citty'
import { x } from 'tinyexec'
import { commandArgs } from '@/args.ts'
import { resolveConfig } from '@/config.ts'
import { downloadStandardUniAppTemplate } from '@/standard.ts'
import { formatDependencyUpdateSummary, generateDependencyUpdatePlan } from '@/update.ts'
import { description, name, version } from '../package.json'

const clearDependencyArtifacts = async (cwd: string, templatePath: string) => {
    await Promise.all([
        rm(resolve(cwd, 'node_modules'), { recursive: true, force: true }),
        rm(resolve(cwd, 'pnpm-lock.yaml'), { force: true }),
    ])

    await rm(resolve(templatePath, 'temp'), { recursive: true, force: true })
}

const reinstallDependencies = async (cwd: string) => {
    await x('npx', ['-y', '@antfu/ni'], {
        nodeOptions: {
            cwd,
            stdio: 'inherit',
        },
    })
}

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
        s.stop('模板依赖收集完成')

        s.start('正在生成最终的 @dcloudio 依赖配置')
        const updatePlan = await generateDependencyUpdatePlan(config)
        s.stop('最终配置生成完成')

        if (updatePlan.changes.length === 0) {
            outro('当前项目的 @dcloudio 依赖无需更新')
            return
        }

        note(formatDependencyUpdateSummary(updatePlan), '待更新的 @dcloudio 依赖')

        const shouldUpdate = await confirm({
            message: `是否写入 ${basename(updatePlan.packageJsonPath)} 的最终配置并继续更新依赖？`,
        })

        if (isCancel(shouldUpdate) || !shouldUpdate) {
            cancel('已取消依赖更新')
            return
        }

        await writeFile(
            updatePlan.packageJsonPath,
            `${JSON.stringify(updatePlan.updatedPackageJson, null, 4)}\n`,
        )

        s.start('正在清理旧依赖与模板缓存')
        await clearDependencyArtifacts(config.cwd, config.templatePath || config.cwd)
        s.stop('旧依赖清理完成')

        s.start('正在通过 @antfu/ni 重装依赖')
        await reinstallDependencies(config.cwd)
        s.stop('依赖重装完成')

        outro('success: @dcloudio 依赖更新完成')
    },
})

createMain(command)({})
