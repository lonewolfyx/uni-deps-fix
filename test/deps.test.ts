import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    compareVersions,
    extractAndMergeDcloudDependencies,
    extractDcloudDependencies,
    mergeDepsWithHighestVersion,
    parseVersion,
} from '@/deps'

describe('deps', () => {
    describe('extractDcloudDependencies', () => {
        it('should extract @dcloudio dependencies only', () => {
            const packageJson = {
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4070620250821001',
                    '@dcloudio/uni-components': '3.0.0-4070620250821001',
                    'vue': '^3.4.21',
                    'pinia': '2.0.36',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.8',
                    '@dcloudio/vite-plugin-uni': '3.0.0-4070620250821001',
                    'typescript': '~5.8.0',
                    'vite': '5.2.8',
                },
            }

            const result = extractDcloudDependencies(packageJson)

            expect(result.dependencies).toEqual({
                '@dcloudio/uni-app': '3.0.0-4070620250821001',
                '@dcloudio/uni-components': '3.0.0-4070620250821001',
            })

            expect(result.devDependencies).toEqual({
                '@dcloudio/types': '^3.4.8',
                '@dcloudio/vite-plugin-uni': '3.0.0-4070620250821001',
            })
        })

        it('should return empty objects when no @dcloudio dependencies', () => {
            const packageJson = {
                dependencies: {
                    vue: '^3.4.21',
                    pinia: '2.0.36',
                },
                devDependencies: {
                    typescript: '~5.8.0',
                },
            }

            const result = extractDcloudDependencies(packageJson)

            expect(result.dependencies).toEqual({})
            expect(result.devDependencies).toEqual({})
        })

        it('should handle empty package.json', () => {
            const packageJson = {}

            const result = extractDcloudDependencies(packageJson)

            expect(result.dependencies).toEqual({})
            expect(result.devDependencies).toEqual({})
        })
    })

    describe('parseVersion', () => {
        it('should parse version correctly', () => {
            const version = '3.0.0-4070620250821001'
            const result = parseVersion(version)

            expect(result.baseVersion).toBe('3.0.0')
            expect(result.versionNumber).toBe(40706)
            expect(result.date).toBe(20250821)
            expect(result.buildNumber).toBe(1)
        })

        it('should parse another version correctly', () => {
            const version = '3.0.0-4080720251210001'
            const result = parseVersion(version)

            expect(result.baseVersion).toBe('3.0.0')
            expect(result.versionNumber).toBe(40807)
            expect(result.date).toBe(20251210)
            expect(result.buildNumber).toBe(1)
        })

        it('should throw error for invalid version format', () => {
            expect(() => parseVersion('invalid')).toThrow('Invalid version format')
            expect(() => parseVersion('3.0.0')).toThrow('Invalid version format')
        })
    })

    describe('compareVersions', () => {
        it('should return higher version based on version number', () => {
            const v1 = '3.0.0-4070620250821001'
            const v2 = '3.0.0-4080720251210001'

            expect(compareVersions(v1, v2)).toBe(v2)
            expect(compareVersions(v2, v1)).toBe(v2)
        })

        it('should return higher version based on date when version numbers are equal', () => {
            const v1 = '3.0.0-4070620250821001'
            const v2 = '3.0.0-4070620251220001'

            expect(compareVersions(v1, v2)).toBe(v2)
            expect(compareVersions(v2, v1)).toBe(v2)
        })

        it('should return higher version based on build number when other parts are equal', () => {
            const v1 = '3.0.0-4070620250821001'
            const v2 = '3.0.0-4070620250821002'

            expect(compareVersions(v1, v2)).toBe(v2)
            expect(compareVersions(v2, v1)).toBe(v2)
        })

        it('should return first version when they are equal', () => {
            const v1 = '3.0.0-4070620250821001'
            const v2 = '3.0.0-4070620250821001'

            expect(compareVersions(v1, v2)).toBe(v1)
        })
    })

    describe('mergeDepsWithHighestVersion', () => {
        it('should merge dependencies and keep highest versions', () => {
            const deps1 = {
                '@dcloudio/uni-app': '3.0.0-4070620250821001',
                '@dcloudio/uni-components': '3.0.0-4070620250821001',
            }

            const deps2 = {
                '@dcloudio/uni-app': '3.0.0-4080720251210001',
                '@dcloudio/uni-h5': '3.0.0-4080720251210001',
            }

            const result = mergeDepsWithHighestVersion(deps1, deps2)

            expect(result).toEqual({
                '@dcloudio/uni-app': '3.0.0-4080720251210001',
                '@dcloudio/uni-components': '3.0.0-4070620250821001',
                '@dcloudio/uni-h5': '3.0.0-4080720251210001',
            })
        })

        it('should handle empty first dependencies', () => {
            const deps1: Record<string, string> = {}
            const deps2 = {
                '@dcloudio/uni-app': '3.0.0-4080720251210001',
            }

            const result = mergeDepsWithHighestVersion(deps1, deps2)

            expect(result).toEqual({
                '@dcloudio/uni-app': '3.0.0-4080720251210001',
            })
        })

        it('should handle empty second dependencies', () => {
            const deps1 = {
                '@dcloudio/uni-app': '3.0.0-4070620250821001',
            }
            const deps2: Record<string, string> = {}

            const result = mergeDepsWithHighestVersion(deps1, deps2)

            expect(result).toEqual({
                '@dcloudio/uni-app': '3.0.0-4070620250821001',
            })
        })

        it('should handle both empty dependencies', () => {
            const deps1: Record<string, string> = {}
            const deps2: Record<string, string> = {}

            const result = mergeDepsWithHighestVersion(deps1, deps2)

            expect(result).toEqual({})
        })
    })

    describe('extractAndMergeDcloudDependencies', () => {
        it('should merge dependencies from template package.json files and keep higher versions', async () => {
            const cwd = await mkdtemp(join(tmpdir(), 'uni-deps-fix-deps-'))
            const tempDir = join(cwd, 'temp')

            await mkdir(join(tempDir, 'unibest'), { recursive: true })
            await mkdir(join(tempDir, 'vitesse-uni-app'), { recursive: true })

            await writeFile(join(tempDir, 'unibest', 'package.json'), JSON.stringify({
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4070620250821001',
                    '@dcloudio/uni-components': '3.0.0-4070620250821001',
                    '@dcloudio/uni-quickapp-webview': '3.0.0-4070620250821001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.8',
                    '@dcloudio/vite-plugin-uni': '3.0.0-4070620250821001',
                },
            }))

            await writeFile(join(tempDir, 'vitesse-uni-app', 'package.json'), JSON.stringify({
                dependencies: {
                    '@dcloudio/uni-app': '3.0.0-4080720251210001',
                    '@dcloudio/uni-components': '3.0.0-4080720251210001',
                    '@dcloudio/uni-quickapp-webview': '3.0.0-4080720251210001',
                },
                devDependencies: {
                    '@dcloudio/types': '^3.4.16',
                    '@dcloudio/vite-plugin-uni': '3.0.0-4080720251210001',
                },
            }))

            const result = await extractAndMergeDcloudDependencies({
                cwd,
                templatePath: cwd,
                dependencies: {},
                devDependencies: {},
            })

            expect(result.dependencies['@dcloudio/uni-app']).toBe('3.0.0-4080720251210001')
            expect(result.dependencies['@dcloudio/uni-components']).toBe('3.0.0-4080720251210001')
            expect(result.dependencies['@dcloudio/uni-quickapp-webview']).toBe('3.0.0-4080720251210001')
            expect(result.devDependencies['@dcloudio/vite-plugin-uni']).toBe('3.0.0-4080720251210001')
            expect(result.devDependencies['@dcloudio/types']).toBe('^3.4.16')
        })
    })
})
