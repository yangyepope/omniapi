# 深度防御校验 (Defense-in-Depth Validation)

## 概览

当你修复了由无效数据引起的 bug 时，在某处添加校验似乎已经足够。但单点检查可能会被不同的代码路径、重构或 Mock（模拟对象）绕过。

**核心原则：** 在数据经过的每一层都进行校验。使 bug 在结构上变得不可能发生。

## 为什么需要多层防御

单点验证：“我们修复了 bug”
多层防御：“我们使 bug 无法发生”

不同的层级可以捕捉不同的情况：
- **入口校验 (Entry validation)**：拦截大多数常见的 bug。
- **业务逻辑库 (Business logic)**：捕捉边界情况。
- **环境守卫 (Environment guards)**：防止特定语境下的危险。
- **调试日志 (Debug logging)**：在其他层失效时提供帮助。

## 四个层级

### 第 1 层：入口点校验
**目的：** 在 API 边界拒绝明显无效的输入。

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory 不能为空');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory 不存在: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory 必须是目录: ${workingDirectory}`);
  }
  // ... 继续执行
}
```

### 第 2 层：业务逻辑校验
**目的：** 确保数据对于此特定操作是有意义的。

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('initializeWorkspace 需要 projectDir');
  }
  // ... 继续执行
}
```

### 第 3 层：环境守卫 (Environment Guards)
**目的：** 防止在特定语境下执行危险动作。

```typescript
async function gitInit(directory: string) {
  // 在测试期间，拒绝在临时目录之外执行 git init
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `测试期间拒绝在临时目录之外初始化 git: ${directory}`
      );
    }
  }
  // ... 继续执行
}
```

### 第 4 层：调试埋点 (Debug Instrumentation)
**目的：** 为事后分析捕获上下文。

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('即将执行 git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... 继续执行
}
```

## 应用该模式

当你发现一个 bug 时：

1. **追踪数据流** —— 错误值源自何处？在哪里被使用？
2. **绘制检查清单** —— 列出数据经过的每一个节点。
3. **在每一层添加校验** —— 入口、业务、环境、调试。
4. **独立测试每一层** —— 尝试绕过第 1 层，验证第 2 层是否能捕获它。

## 会话案例

Bug：空的 `projectDir` 导致了在源代码目录中运行 `git init`。

**数据流：**
1. 测试设置 → 返回空字符串
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 在 `process.cwd()` 中运行

**添加的四层防御：**
- 第 1 层：`Project.create()` 校验是否为空/存在/可写。
- 第 2 层：`WorkspaceManager` 校验 `projectDir` 不为空。
- 第 3 层：`WorktreeManager` 在测试期间拒绝在 tmp 目录外初始化 git。
- 第 4 层：在 `git init` 之前记录堆栈追踪日志。

**结果：** 1847 个测试全部通过，该 bug 无法重现。

## 关键洞察

这四层防御都是必要的。在测试期间，每一层都捕捉到了其他层遗漏的错误：
- 不同的代码路径绕过了入口校验。
- Mock 对象绕过了业务逻辑检查。
- 不同平台的边界情况需要环境守卫来处理。
- 调试日志识别出了结构上的误用。

**不要止步于单点验证。** 在每一层都添加检查。
