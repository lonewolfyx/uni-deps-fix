import type { IResolveConfig } from '@/types'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import semver from 'semver'

export type DependencyMap = Record<string, string>

export interface DepsInfo {
    dependencies: DependencyMap
    devDependencies: DependencyMap
}

interface PackageJsonLike {
    dependencies?: DependencyMap
    devDependencies?: DependencyMap
}

export interface ParsedDcloudVersion {
    baseVersion: string
    versionNumber: number
    date: number
    buildNumber: number
}

/**
 * 从 package.json 中提取 @dcloudio/*** 开头的依赖
 */
export function extractDcloudDependencies(packageJson: PackageJsonLike): DepsInfo {
    const dependencies: DependencyMap = {}
    const devDependencies: DependencyMap = {}

    // 提取 dependencies 中的 @dcloudio 依赖
    if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
            if (name.startsWith('@dcloudio/')) {
                dependencies[name] = version
            }
        }
    }

    // 提取 devDependencies 中的 @dcloudio 依赖
    if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
            if (name.startsWith('@dcloudio/')) {
                devDependencies[name] = version
            }
        }
    }

    return { dependencies, devDependencies }
}

/**
 * 从模板目录读取 package.json
 */
export async function readPackageJson(templatePath: string): Promise<PackageJsonLike> {
    const packageJsonPath = resolve(templatePath, 'package.json')

    if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at ${packageJsonPath}`)
    }

    const content = await readFile(packageJsonPath, 'utf-8')
    return JSON.parse(content)
}

export function parseVersion(version: string): ParsedDcloudVersion {
    const matched = version.match(/^(\d+\.\d+\.\d+)-(\d{5})(\d{8})(\d{3})$/)

    if (!matched) {
        throw new Error(`Invalid version format: ${version}`)
    }

    const [
        ,
        baseVersion = '',
        versionNumber = '',
        date = '',
        buildNumber = '',
    ] = matched

    if (!baseVersion || !versionNumber || !date || !buildNumber) {
        throw new Error(`Invalid version format: ${version}`)
    }

    return {
        baseVersion,
        versionNumber: Number(versionNumber),
        date: Number(date),
        buildNumber: Number(buildNumber),
    }
}

const compareParsedVersions = (left: ParsedDcloudVersion, right: ParsedDcloudVersion): number => {
    if (left.baseVersion !== right.baseVersion) {
        const leftParts = left.baseVersion.split('.').map(Number)
        const rightParts = right.baseVersion.split('.').map(Number)

        for (const index of [0, 1, 2]) {
            const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
            if (diff !== 0) {
                return diff
            }
        }
    }

    if (left.versionNumber !== right.versionNumber) {
        return left.versionNumber - right.versionNumber
    }

    if (left.date !== right.date) {
        return left.date - right.date
    }

    return left.buildNumber - right.buildNumber
}

export function compareVersions(firstVersion: string, secondVersion: string): string {
    if (firstVersion === secondVersion) {
        return firstVersion
    }

    const firstParsed = parseVersion(firstVersion)
    const secondParsed = parseVersion(secondVersion)

    return compareParsedVersions(firstParsed, secondParsed) >= 0
        ? firstVersion
        : secondVersion
}

const compareFallbackVersions = (firstVersion: string, secondVersion: string): string => {
    if (firstVersion === secondVersion) {
        return firstVersion
    }

    const firstSemver = semver.minVersion(firstVersion)
    const secondSemver = semver.minVersion(secondVersion)

    if (firstSemver && secondSemver) {
        return semver.gte(firstSemver, secondSemver) ? firstVersion : secondVersion
    }

    return firstVersion > secondVersion ? firstVersion : secondVersion
}

export function getHigherVersion(firstVersion: string, secondVersion: string): string {
    if (!firstVersion) {
        return secondVersion
    }

    if (!secondVersion) {
        return firstVersion
    }

    try {
        return compareVersions(firstVersion, secondVersion)
    }
    catch {
        return compareFallbackVersions(firstVersion, secondVersion)
    }
}

export function mergeDepsWithHighestVersion(
    deps1: DependencyMap = {},
    deps2: DependencyMap = {},
): DependencyMap {
    const merged: DependencyMap = {}
    const allKeys = Array.from(new Set([...Object.keys(deps1), ...Object.keys(deps2)]))

    for (const name of allKeys) {
        const v1 = deps1[name] || ''
        const v2 = deps2[name] || ''
        merged[name] = getHigherVersion(v1, v2)
    }

    return merged
}

export async function extractAndMergeDcloudDependencies(
    config: IResolveConfig,
): Promise<DepsInfo> {
    const tempPath = resolve(config.templatePath || config.cwd, 'temp')

    // 读取两个模板的 package.json
    const [unibestPkg, vitessePkg] = await Promise.all([
        readPackageJson(resolve(tempPath, 'unibest')),
        readPackageJson(resolve(tempPath, 'vitesse-uni-app')),
    ])

    // 提取 @dcloudio 依赖
    const unibestDeps = extractDcloudDependencies(unibestPkg)
    const vitesseDeps = extractDcloudDependencies(vitessePkg)

    return {
        dependencies: mergeDepsWithHighestVersion(unibestDeps.dependencies, vitesseDeps.dependencies),
        devDependencies: mergeDepsWithHighestVersion(unibestDeps.devDependencies, vitesseDeps.devDependencies),
    }
}
