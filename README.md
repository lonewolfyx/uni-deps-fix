# uni-deps-fix

一个面向 `UniApp + Vue3` 项目的依赖升级 CLI。

它会参考社区内较新的 UniApp 模板，提取其中的 `@dcloudio/*` 依赖版本，再和你当前项目里的版本做对比，生成最终推荐配置，并在你确认后自动写回 `package.json`、清理旧依赖并重新安装。

## 使用方法

```shell
npx uni-deps-fix
```

## 解决什么问题

很多 UniApp 项目在长期维护后，`@dcloudio/*` 相关依赖会逐渐出现这些问题：

- 版本分散，不同包之间不一致
- 一部分依赖过旧，另一部分依赖已经提前升级
- 手动对齐版本成本高，而且容易漏包
- 升级后是否需要同步重装依赖，步骤容易出错

`uni-deps-fix` 的目标就是把这条链路做成一个可重复执行的命令行流程。

## 版本基线来源

当前参考的模板仓库：

- [unibest](https://github.com/feige996/unibest)
- [vitesse-uni-app](https://github.com/uni-helper/vitesse-uni-app)

## License

[MIT](./LICENSE) License © [lonewolfyx](https://github.com/lonewolfyx)
