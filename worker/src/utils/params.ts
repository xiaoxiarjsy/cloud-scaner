export function paramsToObject(params: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {}
  params.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}
