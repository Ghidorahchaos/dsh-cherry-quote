# CherryStudio版上下文引用功能

> 把 Cherry Studio 的「引用选中文本」带到 DeepSeek Harness。  
> 插件包名：`dsh-cherry-quote` · 版本：`1.0.0`

划选对话里的一段文字，右键「引用」；这段原文会变成输入框里的蓝色「引用」小块。悬停可看完整原文，点 `✕` 或按 Backspace 一次删除。发送后，引用会作为 `<blockquote>` 原文交给模型，并在消息里显示为「引用」小块。

![输入框引用块](https://github.com/user-attachments/assets/cf4e8d22-f4fc-44a7-acfb-b614c0f4eb4b)

![发送后引用块](https://github.com/user-attachments/assets/fcc2cb00-dfe7-4a71-ad60-b44bd490a32b)

## 功能

- 划选用户或助手消息中的任意文字；
- 右键「引用」，插入蓝色引用块；
- 悬停显示被引用的完整原文；
- `✕` 删除，或光标贴边时 Backspace/Delete 一次删除；
- 多条引用可以同时存在；
- 发送后消息里显示引用小块，模型收到完整引用原文；
- 纯客户端，不写文件、不联网。

## 安装

### Desktop

1. 打开 **Plugins → Add plugin**；
2. 输入 `dsh-cherry-quote`；
3. 安装后刷新页面。

### CLI

```sh
dsh plugin --profile <profile> add dsh-cherry-quote
```

## 使用

1. 在任意消息里用鼠标划选一段文字；
2. 在选区上右键，选择「引用」；
3. 输入框出现蓝色「引用」小块；
4. 鼠标移到小块上，查看完整原文；
5. 点 `✕`，或把光标贴在小块旁边按 Backspace/Delete，删除整条引用；
6. 在小块后继续写你的反馈，发送。

## 模型看到什么

```text
<blockquote data-cherry-quote="1">

被引用的原文

</blockquote>
```

引用内容会作为当前用户消息的一部分进入模型上下文，不是消息关系引用，也不跨会话。

## 兼容性

- DSH Desktop / Web `>=0.2.1-rc.5`；
- 依赖 DSH 的输入框引用 chip、`UserText` 消息渲染接口；
- DSH 升级后如果接口变化，引用插入或发送后回显可能需要适配。

## 隐私

- 不写文件、不访问网络；
- 引用内容只存在于 DSH 草稿和消息文本中；
- 不收集遥测。

## 已知限制

- 已发送消息里的引用块背景目前是灰色，不影响使用；
- 复制已发送消息到剪贴板时不会带上引用原文；
- 只支持当前会话内的划词 Quote，不包含 `@` 历史会话引用、文档选区引用、回答来源 Citation；
- 不包含消息级“引用整条消息”按钮。

## 开发

```sh
node --check client.js
node test/quote.test.mjs
```

## 许可

MIT，见 [LICENSE](./LICENSE)。
