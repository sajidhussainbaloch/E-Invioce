export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadFile(path: string): Promise<string> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  downloadBlob(await res.blob(), filenameFromPath(path))
  return ''
}

function filenameFromPath(path: string): string {
  return path.split('/').pop()?.replace(/\.pdf$/, '.pdf') ?? 'file'
}