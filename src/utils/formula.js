/**
 * Evaluate a formula string with given inputs and price data.
 * Returns { price: number, log: string, error?: boolean }
 */
export function evalFormula(formula, cInputs, prices, fields) {
  const log = []
  const L = (s) => log.push(s)

  L('=== 公式计算日志 ===')
  L('原始公式: ' + formula)

  // Build variable map
  const varMap = {}

  // All price data
  const allPrices = (prices && prices.allPrices) ? prices.allPrices : {}
  for (const apk in allPrices) { varMap[apk] = allPrices[apk] }

  // Price keyword matching for legacy abbreviations
  const _kwPrice = (kw) => {
    for (const k in allPrices) { if (k.indexOf(kw) !== -1) return allPrices[k] }
    return undefined
  }
  varMap['P中长期'] = _kwPrice('中长期') ?? 0
  varMap['P现货']   = _kwPrice('现货')   ?? 0
  varMap['P实时']   = _kwPrice('现货')   ?? _kwPrice('实时') ?? 0
  varMap['P购电均'] = _kwPrice('加权')   ?? _kwPrice('购电') ?? 0

  // Identify pct_input fields (already converted to decimal in cCalculate)
  const pctCodes = {}
  for (const f of fields) {
    if (f.type === 'pct_input') pctCodes[f.code] = true
  }

  // cInputs
  for (const ck in cInputs) {
    if (cInputs[ck] != null) {
      const isPct = !pctCodes[ck] && (ck.indexOf('K_') === 0 || ck.toLowerCase().indexOf('ratio') !== -1 || ck.indexOf('比例') !== -1)
      varMap[ck] = isPct ? cInputs[ck] / 100 : cInputs[ck]
    }
  }

  // Field names and codes as variables
  for (const f of fields) {
    const lc = (f.code || '').toLowerCase()
    const isRatio = f.type !== 'pct_input' && (lc.indexOf('ratio') !== -1 || lc.indexOf('比例') !== -1)
    const val = cInputs[f.code]
    if (val == null) continue
    const numVal = isRatio ? val / 100 : val
    if (f.name) varMap[f.name] = numVal
    if (f.code) varMap[f.code] = numVal
  }

  // Legacy abbreviations
  const _g = (key) => varMap.hasOwnProperty(key) ? varMap[key] : undefined
  varMap['K固定']   = _g('K固定')   ?? _g('K_fixed')   ?? _g('fixedRatio')  ?? 0
  varMap['P固定']   = _g('P固定')   ?? _g('P_fixed')   ?? _g('fixedPrice')  ?? 0
  varMap['K中长期'] = _g('K中长期') ?? _g('K_lt')      ?? _g('ltRatio')     ?? 0
  varMap['K实时']   = _g('K实时')   ?? _g('K_spot')    ?? _g('spotRatio')   ?? 0
  varMap['K浮动']   = _g('K浮动')   ?? _g('K_float')   ?? _g('floatRatio')  ?? 0
  varMap['K分享']   = _g('K分享')   ?? _g('K_share')   ?? 0
  varMap['K分摊']   = _g('K分摊')   ?? _g('K_shareCost') ?? 0
  varMap['ΔP']      = _g('ΔP')      ?? _g('deltaP')    ?? 0
  varMap['P参考']   = _g('P参考')   ?? _g('P_ref')     ?? _g('refPrice')    ?? 0

  L('--- 变量映射 ---')
  L('C端输入: ' + JSON.stringify(cInputs))
  L('公式字段: ' + fields.map(f => f.name + '(' + f.code + ')').join(', '))
  for (const vk in varMap) { L('  ' + vk + ' = ' + varMap[vk]) }

  let expr = formula
  // Normalize operators
  expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/（/g, '(').replace(/）/g, ')')
  expr = expr.replace(/\s*\)\s*,/g, '),')
  // Implicit multiplication
  expr = expr.replace(/([a-zA-Z一-龥Δ])\s+([a-zA-Z一-龥Δ])/g, '$1*$2')
  expr = expr.replace(/(\d)([a-zA-Z一-龥Δ])/g, '$1*$2')
  expr = expr.replace(/([a-zA-Z一-龥Δ])(\d)/g, '$1*$2')

  // Replace variables (longest first)
  const keys = Object.keys(varMap).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (k.length === 0) continue
    expr = expr.split(k).join('(' + varMap[k] + ')')
  }
  L('变量替换后: ' + expr)

  // Functions
  expr = expr.replace(/min\s*\(/gi, 'Math.min(')

  // IF(cond, trueVal, falseVal) → (cond ? trueVal : falseVal)
  expr = expr.replace(/IF\s*\(/gi, 'IF(')
  while (expr.indexOf('IF(') !== -1) {
    const ifPos = expr.indexOf('IF(')
    const start = ifPos + 3
    let depth = 1, pos = start
    while (pos < expr.length && depth > 0) {
      if (expr[pos] === '(') depth++
      else if (expr[pos] === ')') depth--
      pos++
    }
    if (depth !== 0) { L('ERROR: IF括号不匹配'); return { price: 0, log: log.join('\n'), error: true } }
    const inner = expr.substring(start, pos - 1)
    const parts = []
    let d = 0, last = 0
    for (let j = 0; j < inner.length; j++) {
      if (inner[j] === '(') d++
      else if (inner[j] === ')') d--
      else if (inner[j] === ',' && d === 0) {
        parts.push(inner.substring(last, j).trim())
        last = j + 1
      }
    }
    parts.push(inner.substring(last).trim())
    if (parts.length !== 3) { L('ERROR: IF参数数量=' + parts.length); return { price: 0, log: log.join('\n'), error: true } }
    const replacement = '(' + parts[0] + ' ? ' + parts[1] + ' : ' + parts[2] + ')'
    expr = expr.substring(0, ifPos) + replacement + expr.substring(pos)
  }

  L('JS表达式: ' + expr)

  try {
    const result = eval(expr)
    if (typeof result !== 'number' || isNaN(result)) {
      L('ERROR: 计算结果不是有效数字: ' + result)
      return { price: 0, log: log.join('\n'), error: true }
    }
    L('最终结果: ' + result.toFixed(6))
    return { price: result, log: log.join('\n') }
  } catch (e) {
    L('ERROR: ' + e.message)
    return { price: 0, log: log.join('\n'), error: true }
  }
}

/**
 * Get the field type: explicit type or inferred from code.
 */
export function getFieldType(f) {
  if (f.type === 'text' || f.type === 'pref_select' || f.type === 'pct_input') return f.type
  const lc = (f.code || '').toLowerCase()
  if (lc.indexOf('P参考') !== -1 || lc.indexOf('pref') !== -1) return 'pref_select'
  return 'text'
}

/**
 * Validate and truncate numeric input based on refValue format.
 */
export function validateNumInput(value, refValue) {
  let maxInt = 10, maxDec = 6
  if (refValue) {
    const rp = refValue.split('.')
    maxInt = rp[0].length
    maxDec = rp.length > 1 ? rp[1].length : 0
  }
  let v = value.replace(/[^\d.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  if (parts[0] && parts[0].length > maxInt) parts[0] = parts[0].slice(0, maxInt)
  if (parts.length === 2 && parts[1].length > maxDec) parts[1] = parts[1].slice(0, maxDec)
  return parts.join('.')
}

/**
 * Check if a rule is violated. Returns true if the check fails.
 */
export function checkRuleFail(actual, op, threshold) {
  switch (op) {
    case '>': return actual > threshold
    case '<': return actual < threshold
    case '>=': return actual >= threshold
    case '<=': return actual <= threshold
    case '=': return Math.abs(actual - threshold) < 1e-10
    default: return actual > threshold
  }
}
