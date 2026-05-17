export function shannonEntropy(s: string): number {
  if (!s) return 0
  const freq = new Map<string, number>()
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) || 0) + 1)
  }
  const length = s.length
  let entropy = 0
  for (const count of freq.values()) {
    const p = count / length
    entropy -= p * Math.log2(p)
  }
  return entropy
}
