export function getLast50Chars(str: string): string {
  // 如果字符串长度小于等于50，直接返回整个字符串
  if (str.length <= 50) {
    return str
  }

  // 否则返回最后50个字符
  return str.slice(-50)
}
