import { shannonEntropy } from '../utils/entropy'
import { sha256Hex, newId } from '../utils/crypto'
import { nowIso } from '../utils/date'
import type { Rule } from './rules.data'

export interface FindingInput {
  repo: string
  filePath: string
  url: string
  ruleName: string
  severity: string
  matchedText: string
  rawText: string
  lineNumber: number
}

function mask(text: string): string {
  if (text.length <= 8) {
    return text.slice(0, 2) + '*'.repeat(text.length - 2)
  }
  return text.slice(0, 4) + '*'.repeat(text.length - 8) + text.slice(-4)
}

export function scanContent(
  repo: string,
  filePath: string,
  url: string,
  content: string,
  rules: Rule[],
  minEntropy: number = 4.5
): FindingInput[] {
  const findings: FindingInput[] = []
  const seen = new Set<string>()
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    for (const rule of rules) {
      // Reset lastIndex since we reuse the same regex across lines
      rule.pattern.lastIndex = 0
      const matches = line.matchAll(rule.pattern)
      for (const match of matches) {
        const raw = match[0]
        if (seen.has(raw)) continue
        seen.add(raw)

        if (rule.name === 'Generic Secret Assignment') {
          const token = match[match.length - 1] || raw
          if (shannonEntropy(token) < minEntropy) continue
        }

        findings.push({
          repo,
          filePath,
          url,
          ruleName: rule.name,
          severity: rule.severity,
          matchedText: mask(raw),
          rawText: raw,
          lineNumber
        })
      }
    }
  }

  return findings
}

export function deduplicate(findings: FindingInput[]): FindingInput[] {
  const seen = new Set<string>()
  const unique: FindingInput[] = []
  for (const f of findings) {
    const key = `${f.repo}|${f.filePath}|${f.rawText}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(f)
    }
  }
  return unique
}

export async function findingToRow(f: FindingInput, scanId: string) {
  return {
    id: newId('finding'),
    scan_id: scanId,
    rule_name: f.ruleName,
    severity: f.severity,
    repo: f.repo,
    file_path: f.filePath,
    line_number: f.lineNumber,
    url: f.url,
    matched_text: f.matchedText,
    raw_text_hash: await sha256Hex(f.rawText),
    validation_status: 'unvalidated',
    created_at: nowIso()
  }
}
