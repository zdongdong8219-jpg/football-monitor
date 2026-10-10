# 竞彩足球手机扫盘

独立于FT模型的手机查看项目。云端每30分钟采集在售比赛的竞彩赔率，保存变化快照；综合分析和串关方案按足球方案规则分批写入。B批只有用户明确要求提前时才在15:30启动，未明确要求时按原定计划执行。

- 手机页面：GitHub Pages独立网址
- 数据：`data/state.json`
- 每日方案：`data/latest.json`和`data/reports/`
- 赛果复盘：`data/review-latest.json`和`data/reviews/`
- 本地备份：`work/backup-football.ps1`
- 方案发布：`work/publish-report.ps1`（发布后自动备份）
- 复盘发布：`work/publish-review.ps1`（同步最新复盘和日期归档）
- 不读取、修改或发布FT模型目录
