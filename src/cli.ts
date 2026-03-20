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

        s.start('正在分析最新的依赖...')
        await downloadStandardUniAppTemplate(config)
        s.stop('依赖分析完成')

        s.start('正在整理项目中的 @dcloudio 依赖变更...')
        const updatePlan = await generateDependencyUpdatePlan(config)
        s.stop(`已生成 ${updatePlan.changes.length} 项待处理的依赖变更`)

        if (updatePlan.changes.length === 0) {
            outro('没有发现需要更新的 @dcloudio 依赖，当前配置已经是推荐版本。')
            return
        }

        note(
            formatDependencyUpdateSummary(updatePlan),
            `待确认的 @dcloudio 依赖变更（${updatePlan.changes.length} 项）`,
        )

        const shouldUpdate = await confirm({
            message: `即将更新 ${basename(updatePlan.packageJsonPath)} 并重新安装依赖，是否继续？`,
        })

        if (isCancel(shouldUpdate) || !shouldUpdate) {
            cancel('本次未修改 package.json，也没有执行依赖重装。')
            return
        }

        s.start(`正在写入 ${basename(updatePlan.packageJsonPath)}...`)
        await writeFile(
            updatePlan.packageJsonPath,
            `${JSON.stringify(updatePlan.updatedPackageJson, null, 4)}\n`,
        )
        s.stop(`${basename(updatePlan.packageJsonPath)} 已更新`)

        s.start('正在清理旧依赖、锁文件和模板缓存...')

        await Promise.all([
            rm(resolve(config.cwd, 'node_modules'), { recursive: true, force: true }),
            rm(resolve(config.cwd, 'pnpm-lock.yaml'), { force: true }),
        ])

        await rm(resolve(config.templatePath, 'temp'), { recursive: true, force: true })

        s.stop('旧依赖与模板缓存已清理')

        s.start('正在通过 @antfu/ni 重新安装依赖，这可能需要一点时间...')
        await x('npx', ['-y', '@antfu/ni'], {
            nodeOptions: {
                cwd: config.cwd,
                stdio: 'inherit',
            },
        })
        s.stop('依赖重新安装完成')

        outro(`已完成 ${updatePlan.changes.length} 项 @dcloudio 依赖更新。`)
    },
})

createMain(command)({})
