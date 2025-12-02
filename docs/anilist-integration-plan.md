# AniList 集成方案

## 概述

集成 AniList GraphQL API，用于查询最近热播的动画和当前季度上映的动画连续剧，类似于现有的猫眼和 TMDB 电影查询功能。

## 方案设计

### 1. 架构设计

#### 1.1 服务层结构

```
services/
  └── anilist/
      ├── constants.ts      # API 端点、缓存配置等常量
      ├── env.ts            # 环境变量检查（可选，AniList 不需要 API Key）
      ├── index.ts          # 主要服务函数
      └── types.ts          # TypeScript 类型定义
```

#### 1.2 数据查询策略

**AniList GraphQL API 查询：**

1. **热播动画 (Trending Anime)**
   - 查询条件：按热度排序，评分 >= 7.0
   - 类型：TV 系列（排除电影）
   - 状态：正在播出或已完结（最近 1 年内）

2. **季度动画 (Seasonal Anime)**
   - 查询条件：当前季度（Spring/Summer/Fall/Winter）
   - 类型：TV 系列
   - 状态：正在播出

#### 1.3 数据结构设计

**方案 A：独立数据结构（推荐）**

- 创建独立的 `Anime` 类型，不混入 `MergedMovie`
- 优点：类型清晰，动画和电影分离
- 缺点：需要独立的 UI 组件

**方案 B：统一数据结构**

- 扩展 `MergedMovie` 类型，添加动画相关字段
- 优点：复用现有 UI 组件
- 缺点：类型复杂，逻辑混乱

**推荐使用方案 A**，原因：

- 动画和电影是不同媒体类型
- AniList 数据结构与 TMDB/Maoyan 差异较大
- 未来可能添加更多动画相关功能

### 2. 实现细节

#### 2.1 AniList 服务函数

```typescript
// services/anilist/index.ts

/**
 * 获取热播动画列表
 * @param options 查询选项
 * @returns 动画列表
 */
export async function fetchTrendingAnime(options?: { page?: number; perPage?: number }): Promise<Anime[]>

/**
 * 获取当前季度动画列表
 * @param options 查询选项
 * @returns 动画列表
 */
export async function fetchSeasonalAnime(options?: { page?: number; perPage?: number }): Promise<Anime[]>

/**
 * 合并动画列表（去重、合并数据源）
 * @param options 合并选项
 * @returns 合并后的动画列表
 */
export async function getMergedAnimeList(options?: { includeTrending?: boolean; includeSeasonal?: boolean }): Promise<Anime[]>
```

#### 2.2 数据类型定义

```typescript
// services/anilist/types.ts

export interface Anime {
  // AniList 基础数据
  anilistId: number
  title: {
    romaji: string // 罗马音标题
    english?: string // 英文标题
    native?: string // 日文标题
  }
  coverImage?: string // 封面图片
  bannerImage?: string // 横幅图片
  description?: string // 描述
  averageScore?: number // 平均评分 (0-100)
  popularity?: number // 热度
  status: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED'
  format: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC'
  episodes?: number // 集数
  duration?: number // 每集时长（分钟）
  startDate?: {
    // 开始日期
    year?: number
    month?: number
    day?: number
  }
  endDate?: {
    // 结束日期
    year?: number
    month?: number
    day?: number
  }
  season?: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER' // 季度
  seasonYear?: number // 季度年份
  genres?: string[] // 类型
  studios?: string[] // 制作公司
  source?: string // 原作类型（MANGA, LIGHT_NOVEL 等）

  // 数据源标识
  source: 'trending' | 'seasonal'
  sources: ('trending' | 'seasonal')[]

  // AniList URL
  anilistUrl: string

  // 缓存元数据
  insertedAt?: number
  updatedAt?: number
}
```

#### 2.3 GraphQL 查询示例

```graphql
query TrendingAnime($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME
      format: TV
      sort: TRENDING_DESC
      status_in: [RELEASING, FINISHED]
      averageScore_greater: 70
      startDate_greater: 20230101 # 最近 1 年
    ) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        extraLarge
      }
      bannerImage
      description
      averageScore
      popularity
      status
      format
      episodes
      duration
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      season
      seasonYear
      genres
      studios {
        nodes {
          name
        }
      }
      source
      siteUrl
    }
  }
}
```

### 3. 页面设计

#### 3.1 页面结构选项

**选项 A：独立页面 `/anime`（推荐）**

- 创建独立的动画页面
- 复用电影页面的 UI 组件结构（Card、List、SwipeView）
- 优点：清晰分离，易于维护
- 缺点：需要创建新页面和组件

**选项 B：合并到 `/movies` 页面**

- 在电影页面添加标签页切换（电影/动画）
- 优点：统一入口
- 缺点：页面逻辑复杂，类型混用

**推荐使用选项 A**

#### 3.2 页面组件结构

```
app/anime/
  ├── page.tsx                    # 主页面（SSR）
  ├── AnimeListAdaptive.tsx       # 自适应列表（桌面/移动）
  ├── AnimeList.tsx               # 桌面列表（瀑布流）
  ├── AnimeListMobile.tsx         # 移动端列表
  ├── AnimeSwipeView.tsx          # 移动端滑动视图
  ├── AnimeCard.tsx               # 动画卡片组件
  ├── AnimeSwipeCard.tsx          # 移动端滑动卡片
  ├── AnimePageContent.tsx        # 页面容器
  └── share/
      └── [token]/
          └── page.tsx            # 分享页面
```

### 4. 缓存策略

#### 4.1 请求级缓存

- 使用现有的 `fetchJsonWithCache` 机制
- 缓存时间：热播动画 1 小时，季度动画 6 小时

#### 4.2 GIST 缓存（可选）

- 参考电影系统的 GIST 缓存实现
- 创建 `services/anime/index.ts` 和 `services/anime/cache.ts`
- 定期更新（cron job）

### 5. Cron Job 集成

#### 5.1 创建定时任务

```
app/cron/sync/anime-gist/route.ts
```

- 定期更新动画列表到 GIST
- 调度：每天 04:00, 12:00, 20:00 UTC（与电影同步）

### 6. 环境变量

AniList API 不需要 API Key，但可以配置：

- `ANILIST_CACHE_DURATION_TRENDING`: 热播动画缓存时长（秒）
- `ANILIST_CACHE_DURATION_SEASONAL`: 季度动画缓存时长（秒）

### 7. 实现步骤

1. **阶段 1：服务层**
   - [ ] 创建 `services/anilist/` 目录
   - [ ] 实现 GraphQL 查询函数
   - [ ] 定义类型
   - [ ] 实现合并逻辑

2. **阶段 2：数据层**
   - [ ] 创建 `services/anime/` 目录（GIST 缓存）
   - [ ] 实现缓存逻辑
   - [ ] 创建 Server Actions

3. **阶段 3：UI 层**
   - [ ] 创建 `/anime` 页面
   - [ ] 创建动画卡片组件
   - [ ] 创建列表组件
   - [ ] 实现分享功能

4. **阶段 4：定时任务**
   - [ ] 创建 cron job
   - [ ] 配置调度

### 8. 技术细节

#### 8.1 GraphQL 客户端

- 使用 `fetch` API 直接调用 AniList GraphQL 端点
- 端点：`https://graphql.anilist.co`
- 方法：POST
- Content-Type: `application/json`

#### 8.2 错误处理

- 使用 `Promise.allSettled` 处理多个查询
- 单个查询失败不影响其他查询
- 记录错误日志

#### 8.3 数据过滤

- 只显示 TV 格式（排除电影、OVA 等）
- 评分 >= 7.0
- 状态为正在播出或已完结

### 9. 注意事项

1. **AniList API 限制**
   - 无官方速率限制说明，但建议控制请求频率
   - 使用缓存减少请求

2. **数据同步**
   - 季度动画需要根据当前日期计算季度
   - 热播动画需要设置合理的时间范围

3. **国际化**
   - 支持多语言标题（罗马音、英文、日文）
   - 优先显示英文或日文标题

4. **图片处理**
   - AniList 提供多种尺寸的图片
   - 使用 `extraLarge` 作为封面，`large` 作为缩略图

## 待确认问题

1. **页面位置**：独立页面 `/anime` 还是合并到 `/movies`？
2. **数据结构**：独立 `Anime` 类型还是扩展 `MergedMovie`？
3. **缓存策略**：是否需要 GIST 缓存？
4. **UI 风格**：是否复用电影页面的 UI 组件？
5. **分享功能**：是否需要动画列表分享功能？
