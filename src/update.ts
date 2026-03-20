import type { DependencyMap, DepsInfo } from '@/deps'
import type { IResolveConfig } from '@/types'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
    extractAndMergeDcloudDependencies,
    extractDcloudDependencies,
    mergeDepsWithHighestVersion,
} from '@/deps'

export interface ProjectPackageJson {
    dependencies?: DependencyMap
    devDependencies?: DependencyMap
    [key: string]: unknown
}

export interface DependencyChange {
    name: string
    type: keyof DepsInfo
    currentVersion?: string
    targetVersion: string
}

export interface DependencyUpdatePlan {
    packageJsonPath: string
    currentDcloudDependencies: DepsInfo
    standardDcloudDependencies: DepsInfo
    finalDcloudDependencies: DepsInfo
    changes: DependencyChange[]
    packageJson: ProjectPackageJson
    updatedPackageJson: ProjectPackageJson
}

export async function readProjectPackageJson(cwd: string): Promise<ProjectPackageJson> {
    const packageJsonPath = resolve(cwd, 'package.json')

    if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at ${packageJsonPath}`)
    }

    const content = await readFile(packageJsonPath, 'utf-8')
    return JSON.parse(content)
}

const createDependencyChanges = (
    currentDeps: DependencyMap = {},
    finalDeps: DependencyMap = {},
    type: keyof DepsInfo,
): DependencyChange[] => {
    return Object.entries(finalDeps)
        .filter(([name, version]) => {
            return currentDeps[name] !== version
        })
        .map(([name, targetVersion]) => ({
            name,
            type,
            currentVersion: currentDeps[name],
            targetVersion,
        }))
}

export function buildDependencyUpdatePlan(
    packageJsonPath: string,
    packageJson: ProjectPackageJson,
    standardDcloudDependencies: DepsInfo,
): DependencyUpdatePlan {
    const currentDcloudDependencies = extractDcloudDependencies(packageJson)
    const finalDcloudDependencies: DepsInfo = {
        dependencies: mergeDepsWithHighestVersion(
            standardDcloudDependencies.dependencies,
            currentDcloudDependencies.dependencies,
        ),
        devDependencies: mergeDepsWithHighestVersion(
            standardDcloudDependencies.devDependencies,
            currentDcloudDependencies.devDependencies,
        ),
    }

    const changes = [
        ...createDependencyChanges(
            currentDcloudDependencies.dependencies,
            finalDcloudDependencies.dependencies,
            'dependencies',
        ),
        ...createDependencyChanges(
            currentDcloudDependencies.devDependencies,
            finalDcloudDependencies.devDependencies,
            'devDependencies',
        ),
    ]

    return {
        packageJsonPath,
        currentDcloudDependencies,
        standardDcloudDependencies,
        finalDcloudDependencies,
        changes,
        packageJson,
        updatedPackageJson: {
            ...packageJson,
            dependencies: {
                ...(packageJson.dependencies ?? {}),
                ...finalDcloudDependencies.dependencies,
            },
            devDependencies: {
                ...(packageJson.devDependencies ?? {}),
                ...finalDcloudDependencies.devDependencies,
            },
        },
    }
}

export async function generateDependencyUpdatePlan(config: IResolveConfig): Promise<DependencyUpdatePlan> {
    const standardDcloudDependencies = await extractAndMergeDcloudDependencies(config)
    const packageJsonPath = resolve(config.cwd, 'package.json')
    const packageJson = await readProjectPackageJson(config.cwd)

    return buildDependencyUpdatePlan(
        packageJsonPath,
        packageJson,
        standardDcloudDependencies,
    )
}

export function formatDependencyUpdateSummary(plan: DependencyUpdatePlan): string {
    if (plan.changes.length === 0) {
        return '当前项目中的 @dcloudio 依赖已经是推荐版本，无需更新。'
    }

    const rows = plan.changes.map(change => ({
        name: change.name,
        type: change.type === 'dependencies' ? 'dep' : 'devDep',
        currentVersion: change.currentVersion ?? '(missing)',
        targetVersion: change.targetVersion,
    }))

    const nameWidth = Math.max('Package'.length, ...rows.map(row => row.name.length))
    const typeWidth = Math.max('Type'.length, ...rows.map(row => row.type.length))
    const currentWidth = Math.max('Current'.length, ...rows.map(row => row.currentVersion.length))
    const targetWidth = Math.max('Target'.length, ...rows.map(row => row.targetVersion.length))

    const header = [
        'Package'.padEnd(nameWidth),
        'Type'.padEnd(typeWidth),
        'Current'.padStart(currentWidth),
        'Target'.padStart(targetWidth),
    ].join('  ')

    const divider = '-'.repeat(header.length + 4)

    const body = rows.map((row) => {
        return [
            row.name.padEnd(nameWidth),
            row.type.padEnd(typeWidth),
            row.currentVersion.padStart(currentWidth),
            `-> ${row.targetVersion.padStart(targetWidth)}`,
        ].join('  ')
    })

    return [
        plan.packageJsonPath,
        '',
        header,
        divider,
        ...body,
    ].join('\n')
}
