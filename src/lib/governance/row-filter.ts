/**
 * Row-level security filter.
 *
 * Evaluates row-filter policies defined in IfDataPolicy records.
 * Policies use simple expression strings that are parsed and evaluated
 * safely — NO eval() or raw SQL interpolation.
 *
 * Supported expression syntax:
 *   <column> <op> <value>
 * where op is: = != > < >= <= contains starts_with
 *
 * Example: "status = active"  "age >= 18"  "email contains @acme.com"
 */

export interface RowFilterPolicy {
  filterExpr: string
}

type Row = Record<string, unknown>

/**
 * Filter rows that satisfy ALL active row-filter policies.
 */
export function applyRowFilters(rows: Row[], policies: RowFilterPolicy[]): Row[] {
  if (policies.length === 0) return rows
  return rows.filter((row) => policies.every((p) => evaluateExpr(row, p.filterExpr)))
}

function evaluateExpr(row: Row, expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 3) return true // malformed — allow row

  const [col, op, ...rest] = parts
  const rhs = rest.join(' ')
  const lhs = row[col]

  if (lhs === undefined || lhs === null) return false

  const lhsStr = String(lhs).toLowerCase()
  const rhsStr = rhs.toLowerCase()
  const lhsNum = parseFloat(String(lhs))
  const rhsNum = parseFloat(rhs)

  switch (op) {
    case '=':
    case 'equals':
      return lhsStr === rhsStr
    case '!=':
    case 'not_equals':
      return lhsStr !== rhsStr
    case '>':
      return !isNaN(lhsNum) && !isNaN(rhsNum) && lhsNum > rhsNum
    case '<':
      return !isNaN(lhsNum) && !isNaN(rhsNum) && lhsNum < rhsNum
    case '>=':
      return !isNaN(lhsNum) && !isNaN(rhsNum) && lhsNum >= rhsNum
    case '<=':
      return !isNaN(lhsNum) && !isNaN(rhsNum) && lhsNum <= rhsNum
    case 'contains':
      return lhsStr.includes(rhsStr)
    case 'starts_with':
      return lhsStr.startsWith(rhsStr)
    default:
      return true // unknown op — allow row
  }
}
