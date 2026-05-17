export interface SearchResult {
  repo: string
  filePath: string
  url: string
}

export class GitHubClient {
  private static BASE = 'https://api.github.com'

  constructor(
    private readonly token: string,
    private readonly onStatus?: (message: string) => Promise<void> | void
  ) {}

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
        await this.emit(`GitHub 触发二级限流，10 秒后重试: ${query}`)
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
    for (const currentQuery of this.expandedQueries(query)) {
      let hasResults = false
      let count = 0

      await this.emit(`GitHub 搜索: ${currentQuery}`)

      for await (const result of this.searchCode(currentQuery, 0)) {
        hasResults = true
        count++
        yield result
      }

      await this.emit(`GitHub 搜索完成: ${currentQuery} (${count} 个文件)`)
      if (!hasResults) continue
    }
  }

  private expandedQueries(baseQuery: string): string[] {
    const queries = [baseQuery]
    const langs = ['python', 'javascript', 'typescript', 'go', 'java', 'ruby', 'php', 'rust', 'c', 'cpp']
    const hasLanguage = /\blanguage:/i.test(baseQuery)

    if (!hasLanguage) {
      for (const lang of langs) {
        queries.push(`${baseQuery} language:${lang}`)
      }
    }

    return Array.from(new Set(queries))
  }

  private async emit(message: string): Promise<void> {
    try {
      await this.onStatus?.(message)
    } catch {
      // Logging must not break scanning.
    }
  }

  private delay(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  }
}
