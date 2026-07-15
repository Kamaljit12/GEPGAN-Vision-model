export type ViewMode = 'side' | 'slider'

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageFile(file: File): boolean {
  return /^image\/(png|jpe?g|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name)
}

export function stemName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') || 'image'
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export { hasFiles }

/** Interactive before/after comparison slider */
export function bindCompareSlider(root: HTMLElement): () => void {
  const track = root.querySelector<HTMLElement>('[data-slider-track]')
  const handle = root.querySelector<HTMLElement>('[data-slider-handle]')
  const after = root.querySelector<HTMLElement>('[data-slider-after]')
  if (!track || !handle || !after) return () => undefined

  let active = false
  let activePointerId: number | null = null

  const setRatio = (ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio))
    const pct = `${(clamped * 100).toFixed(2)}%`
    after.style.clipPath = `inset(0 0 0 ${pct})`
    handle.style.left = pct
    handle.setAttribute('aria-valuenow', String(Math.round(clamped * 100)))
  }

  const setPos = (clientX: number) => {
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    setRatio((clientX - rect.left) / rect.width)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    active = true
    activePointerId = e.pointerId
    track.setPointerCapture(e.pointerId)
    setPos(e.clientX)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!active || e.pointerId !== activePointerId) return
    setPos(e.clientX)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return
    active = false
    activePointerId = null
    if (track.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId)
    }
  }

  const onKey = (e: KeyboardEvent) => {
    const now = Number(handle.getAttribute('aria-valuenow') || '50')
    let next = now
    if (e.key === 'ArrowLeft') next = Math.max(0, now - 3)
    if (e.key === 'ArrowRight') next = Math.min(100, now + 3)
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = 100
    if (next === now) return
    e.preventDefault()
    setRatio(next / 100)
  }

  track.addEventListener('pointerdown', onPointerDown)
  track.addEventListener('pointermove', onPointerMove)
  track.addEventListener('pointerup', onPointerUp)
  track.addEventListener('pointercancel', onPointerUp)
  handle.addEventListener('keydown', onKey)

  // Init only when visible; otherwise wait for layout
  requestAnimationFrame(() => setRatio(0.5))

  return () => {
    track.removeEventListener('pointerdown', onPointerDown)
    track.removeEventListener('pointermove', onPointerMove)
    track.removeEventListener('pointerup', onPointerUp)
    track.removeEventListener('pointercancel', onPointerUp)
    handle.removeEventListener('keydown', onKey)
  }
}
