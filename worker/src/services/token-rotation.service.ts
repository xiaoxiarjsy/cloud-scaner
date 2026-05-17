// Simple round-robin token rotation for GitHub API tokens

export class TokenRotator {
  private index = 0

  constructor(private tokens: string[]) {}

  next(): string | null {
    if (this.tokens.length === 0) return null
    const token = this.tokens[this.index % this.tokens.length]
    this.index++
    return token
  }

  static async load(db: D1Database): Promise<TokenRotator> {
    const rows = await db.prepare(
      'SELECT token_value FROM github_tokens WHERE enabled = 1 ORDER BY use_count ASC, last_used_at ASC NULLS FIRST'
    ).all<{ token_value: string }>()
    const tokens = (rows.results || []).map((r) => r.token_value)
    return new TokenRotator(tokens)
  }

  static async markUsed(db: D1Database, tokenValue: string) {
    await db.prepare(
      'UPDATE github_tokens SET use_count = use_count + 1, last_used_at = datetime("now") WHERE token_value = ?'
    ).bind(tokenValue).run()
  }
}
