# Documentation Skills

用于管理项目文档和临时总结文件的规范。

## Summary Documents (总结文档)

* MUST 为所有总结性、说明性文档添加日期编号前缀
* MUST 使用格式 `YYYYMMDD_` 作为文档名前缀（例如：`20260112_FEATURE_SUMMARY.md`）
* MUST 在 `.gitignore` 中添加规则忽略带日期前缀的临时文档
* SHOULD 在任务完成后清理不再需要的带编号总结文档
* MUST 保留核心文档（README.md, .claude/CLAUDE.md, .claude/skills.md 等）

### 文档命名示例

```
✅ 正确：
- 20260112_EMAIL_TEMPLATE_GUIDE.md
- 20260112_FEATURE_IMPLEMENTATION.md
- 20260112_REFACTOR_NOTES.md

❌ 错误：
- EMAIL_TEMPLATE_GUIDE.md  （临时总结，但无日期）
- summary.md               （太通用）
- notes.md                （太通用）
```

### 清理规则

1. 任务完成后，删除当前任务生成的所有带日期前缀的总结文档
2. 保留的文档信息应整合到核心文档中（如 .claude/CLAUDE.md）
3. 使用以下命令查找历史总结文档：
   ```bash
   ls -1 [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*.md
   ```

### .gitignore 规则

必须在 `.gitignore` 中包含：
```gitignore
# Temporary summary documents with date prefix
[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*.md