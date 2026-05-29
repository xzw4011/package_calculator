# 套餐计算器

面向售电业务的套餐价格计算工具，支持后台管理（配置省份、电价、套餐）与 C 端客户自助计算。

## 技术栈

- **Vue 3** — 前端框架
- **Vite 5** — 构建工具
- **Pinia** — 状态管理
- 纯 CSS，无 UI 框架依赖

## 功能

- **后台管理**：省份启停、电价类型配置（按月/按年）、套餐管理（公式编辑、字段配置、校验规则）
- **C 端计算器**：选择套餐 → 输入参数 → 实时计算电价结果
- **公式引擎**：支持 `IF`、`MIN`、`MAX` 等函数及自定义变量表达式求值
- 数据持久化到 `localStorage`

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 3366）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
src/
├── App.vue                      # 根组件（路由、公式计算调度）
├── main.js                      # 入口文件
├── stores/app.js                # Pinia store（全局状态、数据持久化）
├── utils/formula.js             # 公式解析与求值引擎
└── components/
    ├── TopNav.vue               # 顶部导航（后台管理 / C端预览切换）
    ├── BreadcrumbNav.vue        # 面包屑导航
    ├── AdminProvinceTable.vue   # 省份管理
    ├── AdminPriceList.vue       # 电价类型列表
    ├── AdminPriceDetail.vue     # 电价详情编辑
    ├── AdminPackageList.vue     # 套餐列表管理
    ├── ClientInput.vue          # C 端参数输入
    ├── ClientResult.vue         # C 端计算结果展示
    ├── ModalPriceType.vue       # 电价类型弹窗
    ├── ModalPackage.vue         # 套餐编辑弹窗
    ├── ModalConfirm.vue         # 确认删除弹窗
    └── AppToast.vue             # 提示消息
```
