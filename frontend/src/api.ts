const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export { MAX_UPLOAD_BYTES }

export async function checkHealth(signal?: AbortSignal): Promise<{
  ok: boolean
  version?: string
  upscale?: number
  detail?: string
}> {
  try {
    const response = await fetch('/api/health', { signal })
    if (!response.ok) {
      return { ok: false, detail: `API returned ${response.status}` }
    }
    const data = (await response.json()) as { status?: string; version?: string; upscale?: number }
    return {
      ok: data.status === 'ok',
      version: data.version,
      upscale: data.upscale,
    }
  } catch {
    return { ok: false, detail: 'Cannot reach API. Start the FastAPI backend on port 8000.' }
  }
}

export async function restoreImage(file: File, signal?: AbortSignal): Promise<Blob> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image is too large. Please use a file under 15 MB.')
  }

  const form = new FormData()
  form.append('file', file)

  const response = await fetch('/api/restore', {
    method: 'POST',
    body: form,
    signal,
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const data = (await response.json()) as { detail?: string | { msg?: string }[] }
      if (typeof data.detail === 'string') detail = data.detail
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) detail = data.detail[0].msg
    } catch {
      // keep default
    }
    throw new Error(detail)
  }

  return response.blob()
}
