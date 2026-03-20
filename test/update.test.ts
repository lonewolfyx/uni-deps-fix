import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    buildDependencyUpdatePlan,
    formatDependencyUpdateSummary,
    generateDependencyUpdatePlan,
} from '@/update'

describe('update', () => {
    describe('buildDependencyUpdatePlan', () => {
        it('should merge user dependencies with recommended template versions', () => {
            const plan = buildDependencyUpdatePlan(
                '/project/package.json',
                {
                    name: 'demo-app',
                    dependencies: {
                        '@dcloudio/uni-app': '3.0.0-4070620250821001',
                        'vue': '^3.4.21',
                    },
                    devDependencies: {
                        '@dcloudio/types': '^3.4.8',
                    },
                },
                {
                    dependencies: {
                        '@dcloudio/uni-app': '3.0.0-4080720251210001',
                        '@dcloudio/uni-components': '3.0.0-4080720251210001',
                    },
                    devDependencies: {
                        '@dcloudio/types': '^3.4.16',
                        '@dcloudio/vite-plugin-uni': '3.0.0-4080720251210001',
                    },
                },
            )

            expect(plan.finalDcloudDependencies).toEqual({
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4080720251210001',
                    '@dcloudio/uni-components': '3.0.0-4080720251210001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.16',
                    '@dcloudio/vite-plugin-uni': '3.0.0-4080720251210001',
                },
            })

            expect(plan.updatedPackageJson.dependencies).toMatchObject({
                '@dcloudio/uni-app': '3.0.0-4080720251210001',
                '@dcloudio/uni-components': '3.0.0-4080720251210001',
                'vue': '^3.4.21',
            })
            expect(plan.updatedPackageJson.devDependencies).toMatchObject({
                '@dcloudio/types': '^3.4.16',
                '@dcloudio/vite-plugin-uni': '3.0.0-4080720251210001',
            })
            expect(plan.changes).toEqual([
                {
                    name: '@dcloudio/uni-app',
                    type: 'dependencies',
                    currentVersion: '3.0.0-4070620250821001',
                    targetVersion: '3.0.0-4080720251210001',
                },
                {
                    name: '@dcloudio/uni-components',
                    type: 'dependencies',
                    currentVersion: undefined,
                    targetVersion: '3.0.0-4080720251210001',
                },
                {
                    name: '@dcloudio/types',
                    type: 'devDependencies',
                    currentVersion: '^3.4.8',
                    targetVersion: '^3.4.16',
                },
                {
                    name: '@dcloudio/vite-plugin-uni',
                    type: 'devDependencies',
                    currentVersion: undefined,
                    targetVersion: '3.0.0-4080720251210001',
                },
            ])
        })
    })

    describe('generateDependencyUpdatePlan', () => {
        it('should read the user package.json and build the update plan', async () => {
            const cwd = await mkdtemp(join(tmpdir(), 'uni-deps-fix-'))
            const tempDir = join(cwd, 'temp')

            await writeFile(join(cwd, 'package.json'), JSON.stringify({
                name: 'demo-app',
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4070620250821001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.8',
                },
            }))

            await mkdir(join(tempDir, 'unibest'), { recursive: true })
            await mkdir(join(tempDir, 'vitesse-uni-app'), { recursive: true })

            await writeFile(join(tempDir, 'unibest', 'package.json'), JSON.stringify({
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4070620250821001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.8',
                },
            }))

            await writeFile(join(tempDir, 'vitesse-uni-app', 'package.json'), JSON.stringify({
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4080720251210001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.16',
                },
            }))

            const plan = await generateDependencyUpdatePlan({
                cwd,
                templatePath: cwd,
                dependencies: {},
                devDependencies: {},
            })

            expect(plan.packageJsonPath).toBe(join(cwd, 'package.json'))
            expect(plan.finalDcloudDependencies.dependencies['@dcloudio/uni-app']).toBe('3.0.0-4080720251210001')
            expect(plan.finalDcloudDependencies.devDependencies['@dcloudio/types']).toBe('^3.4.16')
        })
    })

    describe('formatDependencyUpdateSummary', () => {
        it('should format the change list for confirmation', () => {
            const plan = buildDependencyUpdatePlan(
                '/project/package.json',
                {
                    dependencies: {},
                    devDependencies: {},
                },
                {
                    dependencies: {
                        '@dcloudio/uni-app': '3.0.0-4080720251210001',
                    },
                    devDependencies: {
                        '@dcloudio/types': '^3.4.16',
                    },
                },
            )

            expect(formatDependencyUpdateSummary(plan)).toBe([
                '/project/package.json',
                '',
                'Package            Type      Current                  Target',
                '----------------------------------------------------------------',
                '@dcloudio/uni-app  dep     (missing)  -> 3.0.0-4080720251210001',
                '@dcloudio/types    devDep  (missing)  ->                ^3.4.16',
            ].join('\n'))
        })
    })
})
