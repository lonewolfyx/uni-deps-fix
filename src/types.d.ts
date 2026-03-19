export interface IResolveConfig {
    cwd: string
    templatePath: string
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
}
