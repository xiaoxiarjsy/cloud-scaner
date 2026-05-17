const severityMap: Record<string, { label: string; color: string }> = {
  critical: { label: '严重', color: 'var(--critical)' },
  high: { label: '高危', color: 'var(--high)' },
  medium: { label: '中危', color: 'var(--medium)' },
  low: { label: '低危', color: 'var(--low)' }
}

export function severityLabel(severity: string): string {
  return severityMap[severity]?.label || severity
}

export function severityColor(severity: string): string {
  return severityMap[severity]?.color || 'var(--app-muted)'
}

export function validationLabel(status: string): string {
  const map: Record<string, string> = {
    unvalidated: '未验证',
    valid: '有效',
    invalid: '无效',
    error: '验证失败',
    unavailable: '不可用'
  }
  return map[status] || status
}

export function validationColor(status: string): string {
  const map: Record<string, string> = {
    valid: 'var(--valid)',
    invalid: 'var(--invalid)',
    error: 'var(--warning)',
    unavailable: 'var(--muted)',
    unvalidated: 'var(--muted)'
  }
  return map[status] || 'var(--app-muted)'
}

export function scanStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待开始',
    running: '扫描中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return map[status] || status
}

export function scanStatusColor(status: string): string {
  const map: Record<string, string> = {
    running: 'var(--transfer)',
    completed: 'var(--valid)',
    failed: 'var(--invalid)',
    cancelled: 'var(--muted)'
  }
  return map[status] || 'var(--app-muted)'
}
