export interface SearchResult {
  repo: string
  filePath: string
  url: string
}

export interface SearchPage {
  items: SearchResult[]
  totalCount?: number
  incompleteResults: boolean
  hasNext: boolean
}

export class GitHubClient {
  private static BASE = 'https://api.github.com'

  constructor(
    private readonly token: string,
    private readonly onStatus?: (message: string) => Promise<void> | void
  ) {}

  async searchCodePage(query: string, page: number, perPage = 100): Promise<SearchPage> {
    await this.emit(`GitHub 搜索页: query="${query}", page=${page}, perPage=${perPage}`)
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
      return this.searchCodePage(query, page, perPage)
    }

    if (resp.status === 422) {
      await this.emit(`GitHub 查询结束: query="${query}" 被 API 拒绝或没有更多结果`)
      return { items: [], incompleteResults: false, hasNext: false }
    }

    if (!resp.ok) {
      throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`)
    }

    const data = (await resp.json()) as {
      total_count?: number
      incomplete_results?: boolean
      items?: Array<{ repository: { full_name: string }; path: string; html_url: string }>
    }
    const items = (data.items || []).map((item) => ({
      repo: item.repository.full_name,
      filePath: item.path,
      url: item.html_url
    }))

    await this.emit(`GitHub 返回: query="${query}", page=${page}, items=${items.length}, total=${data.total_count ?? 'unknown'}, incomplete=${data.incomplete_results ? 'yes' : 'no'}`)
    if (items.length === 0) {
      await this.emit(`GitHub 查询结束: query="${query}" 当前页无结果`)
    }
    if (items.length < perPage) {
      await this.emit(`GitHub 查询结束: query="${query}" 当前页不足 ${perPage} 条`)
    }

    return {
      items,
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results ?? false,
      hasNext: items.length === perPage
    }
  }

  async *searchCode(query: string, limit: number = 30): AsyncGenerator<SearchResult> {
    let page = 1
    const perPage = 100
    let yielded = 0

    while (true) {
      const resultPage = await this.searchCodePage(query, page, perPage)
      if (resultPage.items.length === 0) break

      for (const item of resultPage.items) {
        yield item
        yielded++
        if (limit > 0 && yielded >= limit) {
          await this.emit(`GitHub 查询达到扫描上限: ${yielded}/${limit}`)
          return
        }
      }

      if (!resultPage.hasNext) break
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
          await this.emit(`文件读取成功: ${repo}/${path} (${text.length} bytes)`)
          return text.slice(0, 1_000_000)
        }
        await this.emit(`文件读取跳过: ${repo}/${path} HTTP ${resp.status}`)
        return ''
      } catch (error) {
        await this.emit(`文件读取异常: ${repo}/${path} (${error instanceof Error ? error.message : 'unknown error'})`)
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
      for (const lang of langs) queries.push(`${baseQuery} language:${lang}`)
    }

    return Array.from(new Set(queries))
  }

  static buildSearchQueries(baseQuery: string, unlimited: boolean): string[] {
    if (!unlimited) return [baseQuery]
    const queries = [baseQuery]
    const langs = ['python', 'javascript', 'typescript', 'go', 'java', 'ruby', 'php', 'rust', 'c', 'cpp']
    const hasLanguage = /\blanguage:/i.test(baseQuery)
    if (!hasLanguage) {
      for (const lang of langs) queries.push(`${baseQuery} language:${lang}`)
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
