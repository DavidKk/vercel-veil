const CHINESE_NUMBERS = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 100,
  千: 1e3,
  万: 1e4,
  亿: 1e8,
}

/**
 * 判断字符数组是否全是中文数字字符
 * @param chars - 需要判断的字符数组
 * @returns 如果字符数组中的所有字符都是中文数字字符，则返回 true，否则返回 false
 */
export function isChineseNumber(chars: string[]): chars is (keyof typeof CHINESE_NUMBERS)[] {
  // 遍历字符数组，检查是否每个字符都在 CHINESE_NUMBERS 对象中
  for (const char of chars) {
    if (!(char in CHINESE_NUMBERS)) {
      return false
    }
  }
  return true
}

/**
 * 将中文数字字符串转换为阿拉伯数字
 * @param chineseNumber - 中文数字字符串
 * @returns 转换后的阿拉伯数字，如果输入无效则返回 0
 */
export function chineseToNumber(chineseNumber: string): number {
  // 输入检查，确保是字符串类型
  if (typeof chineseNumber !== 'string') {
    return 0
  }

  const chineseChars = chineseNumber.split('')

  // 检查是否所有字符都是中文数字字符
  if (!isChineseNumber(chineseChars)) {
    return 0
  }

  /** 存储最终结果 */
  let result = 0
  /** 临时存储当前数值 */
  let temp = 0
  /** 存储亿的部分 */
  let billion = 0

  // 遍历中文字符数组，依次处理每个字符
  for (let i = 0; i < chineseChars.length; i++) {
    const char = chineseChars[i]
    const num = CHINESE_NUMBERS[char]

    if (num === 1e8) {
      // 处理亿（10^8）的情况
      result += temp
      result *= num
      // 保存亿的部分
      billion = result
      // 重置临时数值
      temp = 0
      // 重置结果
      result = 0
    } else if (num === 1e4) {
      // 处理万（10^4）的情况
      result += temp
      result *= num
      // 重置临时数值
      temp = 0
    } else if (num >= 10) {
      // 处理十、百、千的情况
      if (temp === 0) {
        // 如果当前没有累积的数值，设为1（如 "十" 应变为 10）
        temp = 1
      }

      // 累积当前的数值
      temp *= num
    } else {
      // 处理个位数字（0-9）的情况
      // 将之前累积的值加入结果中
      result += temp
      // 设定新的数值开始累积
      temp = num
    }
  }

  // 最后处理累积的临时数值和亿的部分
  result += temp
  result += billion

  return result
}
