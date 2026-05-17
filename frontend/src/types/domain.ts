export interface Scan {
  id: string
  query: string
  keyword: string
  org: string
  lang: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress_scanned: number
  progress_skipped: number
  progress_findings: number
  limit_count: number
  min_entropy: number
  error_message?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface ScanProgress {
  scanned: number
  skipped: number
  findings: number
  status: string
  updatedAt: string
  logs?: Array<{ ts: string; level: string; msg: string }>
}

export interface Finding {
  id: string
  scan_id: string
  rule_name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  repo: string
  file_path: string
  line_number: number
  url: string
  matched_text: string
  validation_status: 'unvalidated' | 'valid' | 'invalid' | 'error' | 'unavailable'
  validation_json?: string | null
  validated_at?: string | null
  created_at: string
}

export interface Rule {
  name: string
  pattern: string
  description: string
  severity: string
}

export interface Stats {
  totalScans: number
  totalFindings: number
  criticalFindings: number
  validKeyCount: number
  findingsBySeverity: Record<string, number>
  findingsByValidation: Record<string, number>
  recentScans: Scan[]
}

export interface ValidationResult {
  validationStatus: string
  valid: boolean
  available: boolean
  balance: number
  currency: string
  account?: string
  arn?: string
  remaining?: number
}

export interface CreateScanInput {
  query?: string
  keyword?: string
  org?: string
  lang?: string
  limit?: number
  minEntropy?: number
  autoValidate?: boolean
  skipHistory?: boolean
  rules?: string[]
}
