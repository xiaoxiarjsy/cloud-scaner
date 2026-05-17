export interface SearchResult {
  repo: string
  filePath: string
  url: string
}

export class GitHubClient {
  private static BASE = 'https://api.github.com'

  constructor(private readonly token: string) {}

  async *searchCode(query: string, limit: number = 30): AsyncGenerator<SearchResult> {
    let page = 1
    const perPage = 100
    let yielded = 0

    while (true) {
      const resp = await fetch(
        `${GitHubClient.BASE}/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
        { headers: this.headers() }
      )

      if (resp.status === 403) {
        const remaining = resp.headers.get('X-RateLimit-Remaining')
        if (remaining === '0') {
          const resetAt = resp.headers.get('X-RateLimit-Reset')
          const msg = resetAt
            ? `GitHub API rate limit exceeded, resets at ${new Date(Number(resetAt) * 1000).toISOString()}`
            : 'GitHub API rate limit exceeded'
          throw new Error(msg)
        }
        await this.delay(10)
        continue
      }

      if (resp.status === 422) break

      if (!resp.ok) {
        throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`)
      }

      const data = (await resp.json()) as { items?: Array<{ repository: { full_name: string }; path: string; html_url: string }> }
      const items = data.items || []
      if (items.length === 0) break

      for (const item of items) {
        yield {
          repo: item.repository.full_name,
          filePath: item.path,
          url: item.html_url
        }
        yielded++
        if (limit > 0 && yielded >= limit) return
      }

      if (items.length < perPage) break
      page++
    }
  }

  async getFileContent(repo: string, path: string, retries = 3): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const resp = await fetch(
          `${GitHubClient.BASE}/repos/${repo}/contents/${path}`,
          { headers: { ...this.headers(), Accept: 'application/vnd.github.v3.raw' } }
        )
        if (resp.status === 200) {
          const text = await resp.text()
          return text.slice(0, 1_000_000)
        }
        return ''
      } catch {
        if (attempt < retries - 1) {
          await this.delay(2 * (attempt + 1))
        }
      }
    }
    return ''
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${this.token}`,
      'User-Agent': 'leak-scan/0.1.0'
    }
  }

  async *searchCodeUnlimited(query: string): AsyncGenerator<SearchResult> {
    const seenQueries = new Set<string>()
    let currentQuery = query

    while (true) {
      seenQueries.add(currentQuery)
      let hasResults = false

      for await (const result of this.searchCode(currentQuery, 0)) {
        hasResults = true
        yield result
      }

      if (!hasResults) break

      const nextQuery = this.variantQuery(query, seenQueries)
      if (!nextQuery) break
      currentQuery = nextQuery
    }
  }

  private variantQuery(baseQuery: string, seen: Set<string>): string | null {
    // Try random hex suffix
    const hex = '0123456789abcdef'
    for (let i = 0; i < 10; i++) {
      const suffix = hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]
      const candidate = `${baseQuery} ${suffix}`
      if (!seen.has(candidate)) return candidate
    }

    // Try language filters
    const langs = ['python', 'javascript', 'typescript', 'go', 'java', 'ruby', 'php', 'rust', 'c', 'cpp']
    for (const lang of langs) {
      const candidate = `${baseQuery} language:${lang}`
      if (!seen.has(candidate)) return candidate
    }

    return null
  }

  private delay(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  }
}
