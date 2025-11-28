export type TasiCompanyDailyRecord = {
  /** 序号 - 报表内顺序编号，若表中无则为 null */
  no: number | null
  /** 代码 - 股票代码，若报表无则为空字符串 */
  code: string
  /** 名称 - 公司名称（英文字） */
  name: string
  /** 最新价 - 当日收盘或最新成交价，数值（SAR） */
  lastPrice: number | null
  /** 涨跌幅 - 以百分比表示，例如 2.5 表示 2.5%（正为上涨） */
  changePercent: number | null
  /** 涨跌额 - 最新价 minus 昨收，若可计算则填充，单位同最新价 */
  change: number | null
  /** 成交量 - 当日成交股数或手数（以报表为准） */
  volume: number | null
  /** 成交额 - 当日成交总额（货币单位 SAR） */
  turnover: number | null
  /** 振幅 - (最高-最低)/昨收*100，百分比，若无法计算为 null */
  amplitude: number | null
  /** 最高 - 当日最高价，数值（SAR） */
  high: number | null
  /** 最低 - 当日最低价，数值（SAR） */
  low: number | null
  /** 今开 - 当日开盘价，数值（SAR） */
  open: number | null
  /** 昨收 - 若可从最新价和涨跌幅计算则填充，否则为 null */
  prevClose: number | null
  /** 量比 - 报表若提供则解析，否则为 null */
  volumeRatio: number | null
  /** 换手率 - 近似计算为 turnover/marketCap*100，当无法计算为 null */
  turnoverRate: number | null
  /** 市盈率-动态 - 报表若提供则解析，否则为 null */
  peRatio: number | null
  /** 市净率 - 报表若提供则解析，否则为 null */
  pbRatio: number | null
  /** 总市值 - 报表提供的总市值（SAR），若无则为 null */
  marketCap: number | null
  /** 流通市值 - 报表若提供则解析，否则为 null */
  circulatingMarketCap: number | null
  /** 成交笔数/交易量（报表第8列：No. of Trades），若无则为 null */
  numberOfTrades: number | null
  /** 涨速 - 实时或报表提供的涨速，若无为 null */
  speed: number | null
  /** 5分钟涨跌 - 报表若提供则解析，否则为 null */
  change_5m: number | null
  /** 60日涨跌幅 - 报表若提供则解析，否则为 null */
  change_60d: number | null
  /** 年初至今涨跌幅 - 报表若提供则解析，否则为 null */
  change_ytd: number | null
  /** 报表数据日期 - 从报表页面提取（格式 YYYY-MM-DD），若无法识别为 null */
  date: string | null
}

export type TasiMarketSummary = {
  /** 报表数据日期 - 从报表页面提取（格式 YYYY-MM-DD），用于入库时与下面的市场数据一并保存 */
  date: string | null
  /** 开盘价（SAR） - 对应原数据 "open" */
  open: number | null
  /** 最高价（SAR） - 对应原数据 "high" */
  high: number | null
  /** 最低价（SAR） - 对应原数据 "low" */
  low: number | null
  /** 收盘/最新价（SAR） - 对应原数据 "close" */
  close: number | null
  /** 涨跌额（SAR） - 对应原数据 "change" */
  change: number | null
  /** 涨跌幅（百分比） - 对应原数据 "% change"，例如 -0.03 表示 -0.03% */
  changePercent: number | null
  /** 成交公司数 - 对应原数据 "companies traded" */
  companiesTraded: number | null
  /** 成交量（股或手，视报表） - 对应原数据 "volume traded" */
  volumeTraded: number | null
  /** 成交金额（SAR） - 对应原数据 "value traded  (sar)" */
  valueTraded: number | null
  /** 成交笔数 - 对应原数据 "no. of trades" */
  numberOfTrades: number | null
  /** 市值（SAR） - 对应原数据 "market cap  (sar)" */
  marketCap: number | null
  /** 备注/原始键（可选） - 若需要保留原始未归一化的键或额外说明，可填写此字段（通常不入库） */
  notes?: string | null
}
