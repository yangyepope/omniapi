# 技能编写最佳实践

> 了解如何编写能够被 Claude 成功发现并有效使用的技能。

优秀的技能应当简洁、结构良好，并在实际使用中经过测试。本指南提供了实用的编写决策建议，帮助你编写出易于被 Claude 发现并高效利用的技能。

有关技能工作原理的概念背景，请参阅 [技能概述](/en/docs/agents-and-tools/agent-skills/overview)。

## 核心原则

### 简洁是关键

[上下文窗口](https://platform.claude.com/docs/en/build-with-claude/context-windows) 是一种公共资源。你的技能与 Claude 需要知道的其他所有内容共享该窗口，包括：

* 系统提示词
* 对话历史
* 其他技能的元数据
* 你的实际请求

并非技能中的每个 Token 都会立即产生开销。在启动时，只有所有技能的元数据（名称和描述）会被预加载。当技能变得相关时，Claude 才会读取 `SKILL.md`，并仅在需要时读取额外文件。然而，在 `SKILL.md` 中保持简洁依然很重要：一旦 Claude 加载了它，其中的每一个 Token 都会与对话历史和其他上下文展开竞争。

**默认假设：** Claude 已经非常聪明了

仅添加 Claude 尚未掌握的上下文。对每一条信息提出挑战：

* “Claude 真的需要这段解释吗？”
* “我可以假设 Claude 已经知道这一点吗？”
* “这段文字值得消耗这些 Token 吗？”

**正面示例：简洁**（约 50 个 Token）：

````markdown
## 提取 PDF 文本

使用 pdfplumber 进行文本提取：

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**反面示例：太啰嗦**（约 150 个 Token）：

```markdown
## 提取 PDF 文本

PDF（便携式文档格式）文件是一种常见的文件格式，包含文本、图像和其他内容。要从 PDF 中提取文本，你需要使用一个库。虽然有很多用于 PDF 处理的库，但我们推荐 pdfplumber，因为它易于使用且能很好地处理大多数情况。首先，你需要使用 pip 安装它。然后你可以按照下面的代码进行操作...
```

简洁版假设 Claude 知道 PDF 是什么以及库如何工作。

### 设置适当的自由度

根据任务的易碎性和可变性来匹配详细程度。

**高自由度**（基于文本的指令）：

适用于：
* 多种方法均有效
* 决策依赖于上下文
* 启发式方法指导过程

示例：
```markdown
## 代码审查流程

1. 分析代码结构和组织
2. 检查潜在的 bug 或边界情况
3. 提出关于可读性和可维护性的改进建议
4. 验证是否遵循了项目惯例
```

**中等自由度**（带有参数的伪代码或脚本）：

适用于：
* 存在首选模式
* 接受一定的变动
* 配置会影响行为

示例：
````markdown
## 生成报告

使用此模板并根据需要进行自定义：

```python
def generate_report(data, format="markdown", include_charts=True):
    # 处理数据
    # 生成指定格式的输出
    # （可选）包含可视化图表
```
````

**低自由度**（具体脚本，极少或不带参数）：

适用于：
* 操作易碎且容易出错
* 一致性至关重要
* 必须遵循特定的顺序

示例：
````markdown
## 数据库迁移

严格运行此脚本：

```bash
python scripts/migrate.py --verify --backup
```

不要修改命令或添加额外的标志。
````

**比喻：** 把 Claude 想象成一个在路径上探索的机器人：

* **两侧都是悬崖的窄桥：** 只有一条安全的出路。提供具体的护栏和精确的指令（低自由度）。例如：必须按严格顺序运行的数据库迁移。
* **没有任何危险的开阔场地：** 许多路径都能通向成功。提供大方向并信任 Claude 会找到最佳路线（高自由度）。例如：代码评审，其中上下文决定了最佳方法。

### 在你计划使用的所有模型上进行测试

技能是模型的补充，因此其有效性取决于底层模型。在你计划使用的所有模型上测试你的技能。

**按模型的测试考量：**

* **Claude Haiku**（快速、经济）： 技能是否提供了足够的引导？
* **Claude Sonnet**（平衡）： 技能是否清晰且高效？
* **Claude Opus**（强大的推理能力）： 技能是否避免了过度解释？

对 Opus 完美的技能可能需要为 Haiku 提供更多细节。如果你计划跨多个模型使用技能，请力求使指令在所有模型上都能表现良好。

## 技能结构

<Note>
  **YAML 前置元数据**: `SKILL.md` 的前置元数据需要两个字段：

  * `name` - 人类可读的技能名称（最大 64 字符）
  * `description` - 关于技能作用及何时使用的一行描述（最大 1024 字符）

  有关完整的技能结构细节，请参阅 [技能概述](/en/docs/agents-and-tools/agent-skills/overview#skill-structure)。
</Note>

### 命名规范

使用一致的命名模式，使技能更易于引用和讨论。我们建议为技能名称使用**动名词形式**（动词 + -ing），因为这能清楚地描述技能提供的活动或能力。

**优秀的命名示例（动名词形式）：**
* "Processing PDFs" (处理 PDF)
* "Analyzing spreadsheets" (分析电子表格)
* "Managing databases" (管理数据库)
* "Testing code" (测试代码)
* "Writing documentation" (编写文档)

**可接受的替代方案：**
* 名词短语： "PDF Processing", "Spreadsheet Analysis"
* 行动导向： "Process PDFs", "Analyze Spreadsheets"

**应避免：**
* 模糊的名称： "Helper", "Utils", "Tools"
* 过于宽泛： "Documents", "Data", "Files"
* 技能集合中的模式不一致

一致的命名有助于：
* 在文档和对话中引用技能
* 一眼识破技能的作用
* 组织和搜索多个技能
* 维持专业、统一的技能库

### 编写有效的描述

`description` 字段支持技能发现，应包含技能的作用及何时使用。

<Warning>
  **始终使用第三人称编写**。描述会被注入到系统提示词中，不一致的视角会导致发现问题。

  * **推荐：** "Processes Excel files and generates reports" (处理 Excel 文件并生成报告)
  * **避免：** "I can help you process Excel files" (我可以帮你处理 Excel 文件)
  * **避免：** "You can use this to process Excel files" (你可以使用它来处理 Excel 文件)
</Warning>

**要具体并包含关键词**。应包含技能的作用以及何时使用的具体触发器/上下文。

每个技能只有唯一一个描述字段。描述对于技能选择至关重要：Claude 会利用它从可能存在的 100 多个技能中选出正确的那个。你的描述必须提供足够的细节以便 Claude 决定选择该技能，而 `SKILL.md` 的其余部分则提供具体的实现细节。

有效示例：

**PDF 处理技能：**
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Excel 分析技能：**
```yaml
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```

**Git 提交助手技能：**
```yaml
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

应避免像下面这样模糊的描述：
```yaml
description: Helps with documents
```
```yaml
description: Processes data
```
```yaml
description: Does stuff with files
```

### 渐进式披露模式

`SKILL.md` 充当概览文件，根据需要引导 Claude 查阅详细资料，就像入职指南中的目录一样。

**实用建议：**

* 为了最佳性能，保持 `SKILL.md` 正文在此 500 行以内
* 当接近此限制时，将内容拆分到独立文件中
* 使用以下模式来有效地组织指令、代码和资源

#### 视觉概览：由简入繁

一个基础技能仅由一个包含元数据和指令的 `SKILL.md` 文件组成：

[此处原文档包含一张图片，汉化时保持占位符或引用原链接]

随着技能的增长，你可以捆绑额外的内容，Claude 仅在需要时才会加载它们：

[此处原文档包含一张图片，汉化时保持占位符或引用原链接]

完整的技能目录结构可能如下所示：

```
pdf/
├── SKILL.md              # 主指令（触发时加载）
├── FORMS.md              # 表单填写指南（按需加载）
├── reference.md          # API 参考（按需加载）
├── examples.md           # 使用示例（按需加载）
└── scripts/
    ├── analyze_form.py   # 实用脚本（执行，不加载）
    ├── fill_form.py      # 表单填写脚本
    └── validate.py       # 验证脚本
```

#### 模式 1：带参考资料的高级指南

````markdown
---
name: PDF Processing
description: Extracts text and tables from PDF files, fills forms, and merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## 快速入门

使用 pdfplumber 提取文本：
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## 高级功能

**表单填写**：参见 [FORMS.md](FORMS.md) 获取完整指南
**API 参考**：参见 [REFERENCE.md](REFERENCE.md) 获取所有方法
**示例**：参见 [EXAMPLES.md](EXAMPLES.md) 获取常见模式
````

Claude 仅在需要时才会加载 `FORMS.md`、`REFERENCE.md` 或 `EXAMPLES.md`。

#### 模式 2：特定领域的组织

对于涉及多个领域的技能，按领域组织内容以避免加载无关上下文。当用户询问销售指标时，Claude 只需要阅读与销售相关的模式，而不需要阅读财务或营销数据。这样可以保持较低的 Token 使用量并使上下文集中。

```
bigquery-skill/
├── SKILL.md (概览与导航)
└── reference/
    ├── finance.md (收入、账单指标)
    ├── sales.md (机会、流水线)
    ├── product.md (API 使用、特性)
    └── marketing.md (活动、归因)
```

````markdown SKILL.md
# BigQuery 数据分析

## 可用数据集

**财务 (Finance)**：收入、ARR、账单 → 参见 [reference/finance.md](reference/finance.md)
**销售 (Sales)**：机会、流水线、账户 → 参见 [reference/sales.md](reference/sales.md)
**产品 (Product)**：API 使用、特性、采用情况 → 参见 [reference/product.md](reference/product.md)
**营销 (Marketing)**：活动、归因、邮件 → 参见 [reference/marketing.md](reference/marketing.md)

## 快速搜索

使用 grep 查找特定指标：

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
grep -i "api usage" reference/product.md
```
````

#### 模式 3：条件性细节

展示基础内容，链接到高级内容：

```markdown
# DOCX 处理

## 创建文档

使用 docx-js 创建新文档。参见 [DOCX-JS.md](DOCX-JS.md)。

## 编辑文档

对于简单的编辑，直接修改 XML。

**针对修订 (Tracked changes)**：参见 [REDLINING.md](REDLINING.md)
**针对 OOXML 细节**：参见 [OOXML.md](OOXML.md)
```

Claude 只有在用户需要这些功能时才会阅读 `REDLINING.md` 或 `OOXML.md`。

### 避免深度嵌套的引用

当文件从其他已引用的文件中再次被引用时，Claude 可能会仅部分阅读这些文件。当遇到嵌套引用时，Claude 可能会使用 `head -100` 之类的命令来预览内容，而不是阅读整个文件，从而导致信息不完整。

**保持引用与 `SKILL.md` 只有一级深度**。所有参考文件应当直接从 `SKILL.md` 链接，以确保 Claude 在需要时能够阅读文件的完整内容。

**反面示例：太深了**：
```markdown
# SKILL.md
见 [advanced.md](advanced.md)...

# advanced.md
见 [details.md](details.md)...

# details.md
这里才是实际的信息...
```

**正面示例：一级深度**：
```markdown
# SKILL.md

**基本用法**：[在 SKILL.md 中的指令]
**高级功能**：参见 [advanced.md](advanced.md)
**API 参考**：参见 [reference.md](reference.md)
**示例**：参见 [examples.md](examples.md)
```

### 为较长的参考文件构建目录

对于超过 100 行的参考文件，请在顶部包含目录。这确保了 Claude 即使在通过部分读取进行预览时，也能看到可用信息的全貌。

示例：
```markdown
# API 参考

## 目录
- 认证与设置
- 核心方法 (create, read, update, delete)
- 高级功能 (批量操作、Webhooks)
- 错误处理模式
- 代码示例

## 认证与设置
...
```

Claude 随后可以根据需要阅读完整文件或跳转到特定章节。

## 工作流与反馈循环

### 为复杂任务使用工作流

将复杂的操分解为清晰、顺序的步骤。对于特别复杂的工作流，提供一个核对清单，以便 Claude 可以将其复制到回复中，并随着进度的推进逐一勾选。

**示例 1：研究综合工作流（针对不含代码的技能）：**

````markdown
## 研究综合工作流

复制此核对清单并追踪你的进度：

```
研究进度：
- [ ] 第 1 步：阅读所有源文档
- [ ] 第 2 步：识别核心主题
- [ ] 第 3 步：交叉验证主张
- [ ] 第 4 步：创建结构化摘要
- [ ] 第 5 步：验证引用
```

**第 1 步：阅读所有源文档**
查看 `sources/` 目录中的每个文档。记录主要论点和支持证据。

**第 2 步：识别核心主题**
寻找跨源模式。哪些主题反复出现？各来源在哪里达成了一致或存在分歧？

**第 3 步：交叉验证主张**
对于每个主要主张，验证其是否出现在源代码中。记录哪个来源支持了哪个观点。

**第 4 步：创建结构化摘要**
按主题组织发现。包括：核心主张、来源的支持证据、冲突观点（如有）。

**第 5 步：验证引用**
检查每个主张是否引用了正确的源文档。如果引用不完整，返回第 3 步。
````

此示例展示了工作流如何应用于不需要代码的分析任务。核对清单模式适用于任何复杂的多步流程。

**示例 2：PDF 表单填写工作流（针对包含代码的技能）：**

````markdown
## PDF 表单填写工作流

复制此核对清单并在完成各项任务时进行勾选：

```
任务进度：
- [ ] 第 1 步：分析表单 (运行 analyze_form.py)
- [ ] 第 2 步：创建字段映射 (编辑 fields.json)
- [ ] 第 3 步：验证映射 (运行 validate_fields.py)
- [ ] 第 4 步：填写表单 (运行 fill_form.py)
- [ ] 第 5 步：验证输出 (运行 verify_output.py)
```

**第 1 步：分析表单**
运行： `python scripts/analyze_form.py input.pdf`
这将提取表单字段及其位置，并保存到 `fields.json`。

**第 2 步：创建字段映射**
编辑 `fields.json` 为每个字段添加对应的值。

**第 3 步：验证映射**
运行： `python scripts/validate_fields.py fields.json`
在继续之前，修正所有验证错误。

**第 4 步：填写表单**
运行： `python scripts/fill_form.py input.pdf fields.json output.pdf`

**第 5 步：验证输出**
运行： `python scripts/verify_output.py output.pdf`
如果验证失败，返回第 2 步。
````

清晰的步骤可以防止 Claude 跳过关键的验证环节。核对清单有助于你和 Claude 共同追踪多步工作流的进度。

### 实施反馈循环

**常用模式**： 运行验证程序 ——> 修正错误 ——> 重复

此模式能显著提高输出质量。

**示例 1：风格指南合规性（针对不含代码的技能）：**

```markdown
## 内容审查流程

1. 按照 STYLE_GUIDE.md 中的指南起草内容
2. 对照核对清单进行审查：
   - 检查术语一致性
   - 验证示例是否符合标准格式
   - 确认所有必填章节都已存在
3. 如果发现问题：
   - 记录每个问题及其具体的章节引用
   - 修改内容
   - 重新审查核对清单
4. 只有在满足所有要求后才能继续
5. 定稿并保存文档
```

这展示了使用参考文档而非脚本的验证循环模式。STYLE\_GUIDE.md 就是“验证器”，Claude 通过阅读和对比来执行检查。

**示例 2：文档编辑流程（针对包含代码的技能）：**

```markdown
## 文档编辑流程

1. 对 `word/document.xml` 进行编辑
2. **立刻验证**： `python ooxml/scripts/validate.py unpacked_dir/`
3. 如果验证失败：
   - 仔细查看错误消息
   - 修正 XML 中的问题
   - 再次运行验证
4. **只有在验证通过后才能继续**
5. 重新打包： `python ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. 测试输出文档
```

验证循环可以及早发现错误。

## 内容指南

### 避免时效性信息

不要包含会过期的信息：

**反面示例：有时效性**（未来会变错）：
```markdown
如果你是在 2025 年 8 月之前进行此操作，请使用旧 API。
在 2025 年 8 月之后，请使用新 API。
```

**正面示例**（使用“旧模式 (Old patterns)”章节）：
```markdown
## 当前方法
使用 v2 API 端点： `api.example.com/v2/messages`

## 旧模式
<details>
<summary>旧版 v1 API (2025-08 弃用)</summary>
v1 API 使用： `api.example.com/v1/messages`
此端点不再受支持。
</details>
```

“旧模式”章节提供了历史背景，又不会干扰主要内容。

### 使用一致的术语

选择一个术语并贯穿整个技能：

**正确 —— 一致：**
* 始终是 "API endpoint" (API 端点)
* 始终是 "field" (字段)
* 始终是 "extract" (提取)

**错误 —— 不一致：**
* 混用 "API endpoint", "URL", "API route", "path"
* 混用 "field", "box", "element", "control"
* 混用 "extract", "pull", "get", "retrieve"

一致性有助于 Claude 理解并遵循指令。

## 常用模式

### 模板模式 (Template pattern)

为输出格式提供模板。根据需要匹配严格程度。

**针对严格要求**（如 API 响应或数据格式）：
````markdown
## 报告结构

始终使用此确切的模板结构：

```markdown
# [分析标题]

## 执行摘要
[对核心发现的一段式概览]

## 核心发现
- 带有支持数据的发现 1
- 带有支持数据的发现 2
- 带有支持数据的发现 3

## 建议
1. 具体的、可操作的建议
2. 具体的、可操作的建议
```
````

**针对灵活引导**（需要适配时）：
````markdown
## 报告结构

这是一个合理的默认格式，但请根据分析情况发挥你的专业判断：

```markdown
# [分析标题]

## 执行摘要
[概览]

## 核心发现
[根据你的发现来适配各章节]

## 建议
[根据具体上下文量身定制]
```

根据具体的分析类型需求调整章节。
````

### 示例模式 (Examples pattern)

对于输出质量依赖于参考范例的技能，提供输入/输出对，就像通常的提示词工程一样：

````markdown
## Commit 消息格式

参考以下示例生成提交消息：

**示例 1：**
输入：添加了使用 JWT 令牌的用户身份验证
输出：
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**示例 2：**
输入：修复了报告中日期显示不正确的 bug
输出：
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

**示例 3：**
输入：更新了依赖并重构了错误处理
输出：
```
chore: update dependencies and refactor error handling

- Upgrade lodash to 4.17.21
- Standardize error response format across endpoints
```

遵循此风格：类型(范围): 简要描述，然后是详细解释。
````

相比于单纯的描述，示例能更清晰地帮助 Claude 理解所需的风格和详细程度。

### 条件工作流模式 (Conditional workflow pattern)

引导 Claude 经历决策点：

```markdown
## 文档修改工作流

1. 确定修改类型：

   **创建新内容？** ——> 遵循下方的“创建工作流”
   **编辑既有内容？** ——> 遵循下方的“编辑工作流”

2. 创建工作流：
   - 使用 docx-js 库
   - 从头构建文档
   - 导出为 .docx 格式

3. 编辑工作流：
   - 解包既有文档
   - 直接修改 XML
   - 每次修改后进行验证
   - 完成后重新打包
```

<Tip>
  如果工作流包含许多步骤、变得庞大或复杂，请考虑将其放入离的文件中，并告诉 Claude 根据当前任务阅读相应的文件。
</Tip>

## 评估与迭代

### 优先构建评估方案

**在编写详尽的文档之前，先创建评估方案。** 这能确保你的技能是用来解决真实问题的，而不是在记录那些想象出来的需求。

**评估驱动开发 (Evaluation-driven development)：**

1. **识别差距**： 在没有技能的情况下，让 Claude 处理代表性任务。记录具体的失败表现或缺失的上下文。
2. **创建评估方案**： 构建三个能测试这些差距的场景。
3. **建立基准线**： 衡量 Claude 在没有技能的情况下的表现。
4. **编写最简指令**： 创建刚好足够解决差距并通过评估的内容。
5. **迭代**： 执行评估，与基准线对比，并不断完善。

这种方法能确保你是在解决实际问题，而不是在预测那些可能永远不会出现的需求。

**评估结构示例**：

```json
{
  "skills": ["pdf-processing"],
  "query": "从这个 PDF 文件中提取所有文本并保存到 output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "使用合适的 PDF 处理库或命令行工具成功读取 PDF 文件",
    "从文档的所有页面中提取文本内容，不遗漏任何页面",
    "以清晰、可读的格式将提取的文本保存到名为 output.txt 的文件中"
  ]
}
```

<Note>
  此示例展示了带有简单测试准则的数据驱动评估。我们将评估视为衡量技能有效性的真实依据。
</Note>

### 与 Claude 协作迭代开发技能

最有效的技能开发过程通常涉及 Claude 自身。你可以与一个 Claude 实例（“Claude A”）协作来创建一项技能，供其他实例（“Claude B”）使用。Claude A 帮助你设计和精练指令，而 Claude B 则在实际任务中测试它们。这种方式之所以有效，是因为 Claude 模型既理解如何编写有效的代理指令，也理解代理需要哪些信息。

**创建新技能的流程：**

1. **在没有技能的情况下完成任务**： 使用普通的提示词与 Claude A 共同解决一个问题。在工作过程中，你会自然地提供上下文、解释偏好并分享流程性知识。留意那些你反复提供的信息。
2. **识别可重用的模式**： 完成任务后，识别出哪些上下文对未来的类似任务是有用的。
   * **示例**： 如果你完成了一次 BigQuery 分析，你可能提供了表名、字段定义、过滤规则（如“始终排除测试账户”）和常用的查询模式。
3. **要求 Claude A 创建技能**： “创建一个技能来捕捉我们刚刚使用的这个 BigQuery 分析模式。包含表结构、命名规范以及过滤测试账户的规则。”
   <Tip>
     Claude 模型原生理解技能的格式和结构。你不需要专门的系统提示词或特定的“编写技能”技能来让 Claude 协助你。只需提出要求，它就能生成结构正确的 `SKILL.md` 内容（包含合适的前置元数据和正文）。
   </Tip>
4. **审查简洁度**： 检查 Claude A 是否添加了不必要的解释。要求它： “删掉关于胜率含义的解释 —— Claude 已经知道那个了。”
5. **优化信息架构**： 要求 Claude A 更有效地组织内容。例如： “把表结构组织到一个独立的参考文件中。我们以后可能会添加更多表。”
6. **在类似任务上测试**： 让 Claude B（加载了该技能的新实例）处理相关的用例。观察 Claude B 是否能找到正确的信息、正确应用规则并成功完成任务。
7. **基于观察进行迭代**： 如果 Claude B 表现不佳或遗漏了什么，带上具体情况反馈给 Claude A： “当 Claude 使用该技能时，它忘了按 Q4 的日期进行过滤。我们是否应该添加一个关于日期过滤模式的章节？”

**迭代现有技能：**

当改进技能时，同样遵循这种层级模式。你在以下环节之间交替进行：

* **与 Claude A 协作**（协助完善技能的专家）
* **使用 Claude B 进行测试**（使用技能执行实际工作的代理）
* **观察 Claude B 的行为**，并将洞察反馈给 Claude A

1. **在真实工作流中使用技能**： 给 Claude B（已加载技能）分配实际任务，而非仅仅是测试场景。
2. **观察 Claude B 的行为**： 记录它在哪里遇到困难、在哪里成功，或者做出了哪些意料之外的选择。
   * **观察示例**： “当我向 Claude B 索要区域销售报告时，它写了查询语句，但忘了过滤掉测试账户，尽管技能中提到了这条规则。”
3. **向 Claude A 寻求改进**： 分享当前的 `SKILL.md` 并描述你的观察。询问： “我发现当我索要区域报告时，Claude B 忘了过滤测试账户。技能中提到了过滤，但也许不够醒目？”
4. **审查 Claude A 的建议**： Claude A 可能会建议重新组织结构以使规则更突出，使用更强硬的语言（如使用“必须过滤”而非“始终过滤”），或重构工作流章节。
5. **应用并测试更改**： 使用 Claude A 的优化方案更新技能，然后在类似的请求上再次用 Claude B 进行测试。

## 进阶主题

### 运行时环境与资产管理

技能的“文件系统”式架构支持渐进式披露。理解其运作方式有助于你更高效地管理 Token。

*   **元数据阶段**：仅加载 `plugin.json` 和 `SKILL.md` 的前置 YAML。Claude 据此决定是否激活技能。
*   **指令阶段**：当技能被激活，`SKILL.md` 正文加载进上下文。
*   **资产阶段**：Claude 仅在需要时阅读位于 `reference/`、`scripts/` 或同级目录中的额外文件。

**最佳实践**：
- 避免在 `SKILL.md` 中硬编码长格式数据，应将其存入 `.json` 或 `.csv` 文件。
- 使用脚本（如 Python 或 Bash）处理复杂的逻辑，而不是在文档中编写伪代码。
- 通过链接（如 `参见 [file.md](file.md)`）引导 Claude 加载资产，而不是试图一次性展示所有内容。

### 处理时效性与版本控制

如果技能所针对的工具或 API 经常变动，采用以下策略：

1.  **版本化文档**：在文件名或目录名中明确版本（如 `v1-api/`, `v2-api/`）。
2.  **默认指向最新版**：`SKILL.md` 应当始终指向当前的稳定实践。
3.  **使用“旧模式”章节**：通过 `<details>` 标签隐藏弃用的方法，为维护旧项目提供参考，同时不干扰新开发。

## 反面模式 (Anti-Patterns)

**❌ 在正文中使用 XML 标签**
Claude 的内部指令常使用 XML。在技能文档中使用 XML 可能导致模型混淆指令优先级。
✅ **修正**：使用标准的 Markdown 标题和代码块。

**❌ 深度嵌套的引用**
如 `A -> B -> C`。Claude 在跨层跳转时可能会丢失上下文，或仅进行“部分读取”（如 `head -100`），导致获取的信息不完整。
✅ **修正**：所有参考文件应当直接从 `SKILL.md` 链接。

**❌ 描述字段包含工作流摘要**
描述应当只讲“何时用”，不要讲“怎么做”。如果描述里写了操作步骤，Claude 可能会跳过阅读正文而直接按简化的描述操作。
✅ **修正**：将所有流程细节留在 `SKILL.md` 的工作流章节。

**❌ 包含敏感信息**
技能文件可能会被共享或记录在对话历史中。
✅ **修正**：严禁在技能中硬编码 API 密钥、密码或私有数据。使用环境变量或要求用户提供输入。

## 结语

编写技能不仅仅是编写文档，它是在**编程 Claude 的行为**。

通过遵循简洁性原则、采用 TDD 模式的迭代开发，并结合渐进式披露的架构，你可以构建出一套强大的技能库，使你的 AI 编辑伙伴在面对复杂、重复或关键任务时表现得更加稳健、可靠。

---
*本指南由 Anthropic 提供的最佳实践总结而成。*


