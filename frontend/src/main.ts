import './style.css'
import { checkHealth, restoreImage } from './api'
import {
  bindCompareSlider,
  formatBytes,
  hasFiles,
  isImageFile,
  stemName,
  type ViewMode,
} from './utils'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="app-root" id="app-root" data-mode="idle">
    <div class="glow" aria-hidden="true"></div>

    <header class="topbar">
      <a class="logo" href="/" aria-label="GFPGAN home">
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="logo-text">GFP<span>GAN</span></span>
      </a>
      <div class="topbar-meta">
        <span class="chip" id="model-chip">v1.3 · 2×</span>
        <span class="health" id="health" data-state="checking">
          <span class="health-dot" aria-hidden="true"></span>
          <span id="health-label">Checking API…</span>
        </span>
      </div>
    </header>

    <main class="main">
      <section class="landing" id="landing">
        <div class="landing-copy">
          <p class="eyebrow reveal">Face restoration</p>
          <h1 class="brand reveal reveal-delay-1">GFP<span>GAN</span></h1>
          <p class="headline reveal reveal-delay-1">Studio-grade face recovery for damaged photos.</p>
          <p class="lede reveal reveal-delay-2">
            Drop in a portrait. The model detects faces, restores detail, and returns a cleaner result — original and restored, side by side.
          </p>
          <div class="cta-row reveal reveal-delay-2">
            <button type="button" class="btn btn-primary" id="pick-btn">
              <span class="btn-icon" aria-hidden="true">+</span>
              Upload image
            </button>
            <p class="micro">PNG, JPEG, WebP · max 15&nbsp;MB</p>
          </div>
        </div>
        <div class="landing-visual reveal reveal-delay-3" aria-hidden="true">
          <div class="visual-frame">
            <div class="visual-split">
              <div class="visual-half visual-before">
                <span>Before</span>
              </div>
              <div class="visual-half visual-after">
                <span>After</span>
              </div>
              <div class="visual-divider"></div>
            </div>
          </div>
        </div>
      </section>

      <div class="drop-catch" id="dropzone" aria-hidden="true">
        <div class="drop-panel">
          <div class="drop-ring" aria-hidden="true"></div>
          <p class="drop-title">Drop photo to restore</p>
          <p class="drop-sub">Release to start GFPGAN processing</p>
        </div>
      </div>
      <input id="file-input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden />

      <section class="workspace" id="workspace">
        <div class="workspace-bar">
          <div class="file-info">
            <p class="file-name" id="file-name">—</p>
            <p class="file-meta" id="file-meta"></p>
          </div>
          <div class="toolbar" role="toolbar" aria-label="Result controls">
            <div class="seg" role="group" aria-label="Compare layout">
              <button type="button" class="seg-btn" data-view="slider" id="view-slider" aria-pressed="false">Slider</button>
              <button type="button" class="seg-btn is-active" data-view="side" id="view-side" aria-pressed="true">Side by side</button>
            </div>
            <a class="btn btn-primary btn-sm is-disabled" id="download-btn" download="restored.png" href="#" aria-disabled="true">Download</a>
            <button type="button" class="btn btn-ghost btn-sm" id="another-btn">New image</button>
          </div>
        </div>

        <div class="progress" id="progress">
          <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>
          <p class="progress-label" id="progress-label">Preparing…</p>
        </div>

        <div class="result" id="result">
          <div class="slider-view" id="slider-view" data-slider-root>
            <div class="slider-stage" data-slider-track>
              <img class="slider-base" id="slider-original" alt="Original" />
              <div class="slider-after" data-slider-after>
                <img id="slider-restored" alt="Restored" />
              </div>
              <div
                class="slider-handle"
                data-slider-handle
                tabindex="0"
                aria-label="Drag to compare original and restored"
                role="slider"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="50"
              >
                <span class="slider-grip" aria-hidden="true"></span>
              </div>
              <span class="slider-tag slider-tag-l">Original</span>
              <span class="slider-tag slider-tag-r">Restored</span>
            </div>
          </div>

          <div class="side-view is-active" id="side-view">
            <figure class="panel">
              <figcaption>Original</figcaption>
              <div class="panel-frame">
                <img id="side-original" alt="Original uploaded image" />
              </div>
            </figure>
            <figure class="panel">
              <figcaption>
                Restored
                <span class="pill">v1.3</span>
              </figcaption>
              <div class="panel-frame" id="restored-frame">
                <img id="side-restored" alt="Restored image" />
                <div class="panel-loader" id="panel-loader">
                  <span class="spinner" aria-hidden="true"></span>
                  <span>Restoring faces…</span>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>
    </main>

    <div class="toast-host" id="toast-host" aria-live="polite"></div>

    <footer class="site-footer">
      <span>GFPGAN Vision</span>
      <span class="sep" aria-hidden="true">·</span>
      <span>Local inference · FastAPI backend</span>
    </footer>
  </div>
`

const root = document.querySelector<HTMLDivElement>('#app-root')!
const pickBtn = document.querySelector<HTMLButtonElement>('#pick-btn')!
const anotherBtn = document.querySelector<HTMLButtonElement>('#another-btn')!
const downloadBtn = document.querySelector<HTMLAnchorElement>('#download-btn')!
const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const healthEl = document.querySelector<HTMLElement>('#health')!
const healthLabel = document.querySelector<HTMLSpanElement>('#health-label')!
const modelChip = document.querySelector<HTMLSpanElement>('#model-chip')!
const fileNameEl = document.querySelector<HTMLParagraphElement>('#file-name')!
const fileMetaEl = document.querySelector<HTMLParagraphElement>('#file-meta')!
const progress = document.querySelector<HTMLDivElement>('#progress')!
const progressBar = document.querySelector<HTMLDivElement>('#progress-bar')!
const progressLabel = document.querySelector<HTMLParagraphElement>('#progress-label')!
const restoredFrame = document.querySelector<HTMLDivElement>('#restored-frame')!
const toastHost = document.querySelector<HTMLDivElement>('#toast-host')!
const sliderView = document.querySelector<HTMLDivElement>('#slider-view')!
const sideView = document.querySelector<HTMLDivElement>('#side-view')!
const viewSliderBtn = document.querySelector<HTMLButtonElement>('#view-slider')!
const viewSideBtn = document.querySelector<HTMLButtonElement>('#view-side')!

const imgs = {
  sliderOriginal: document.querySelector<HTMLImageElement>('#slider-original')!,
  sliderRestored: document.querySelector<HTMLImageElement>('#slider-restored')!,
  sideOriginal: document.querySelector<HTMLImageElement>('#side-original')!,
  sideRestored: document.querySelector<HTMLImageElement>('#side-restored')!,
}

let originalUrl: string | null = null
let restoredUrl: string | null = null
let abortController: AbortController | null = null
let unbindSlider: (() => void) | null = null
let progressTimer: number | undefined
let progressHideTimer: number | undefined
let apiReady = false
let healthRequestId = 0
let restoreRequestId = 0

function toast(message: string, kind: 'error' | 'info' = 'info') {
  const el = document.createElement('div')
  el.className = `toast toast-${kind}`
  el.textContent = message
  toastHost.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  window.setTimeout(() => {
    el.classList.remove('show')
    window.setTimeout(() => el.remove(), 280)
  }, 4200)
}

function setMode(mode: 'idle' | 'working' | 'done') {
  root.dataset.mode = mode
}

function setView(mode: ViewMode) {
  sliderView.classList.toggle('is-active', mode === 'slider')
  sideView.classList.toggle('is-active', mode === 'side')
  viewSliderBtn.classList.toggle('is-active', mode === 'slider')
  viewSideBtn.classList.toggle('is-active', mode === 'side')
  viewSliderBtn.setAttribute('aria-pressed', String(mode === 'slider'))
  viewSideBtn.setAttribute('aria-pressed', String(mode === 'side'))
}

function revokeUrls() {
  if (originalUrl) URL.revokeObjectURL(originalUrl)
  if (restoredUrl) URL.revokeObjectURL(restoredUrl)
  originalUrl = null
  restoredUrl = null
}

function clearImageSrcs() {
  imgs.sliderOriginal.removeAttribute('src')
  imgs.sliderRestored.removeAttribute('src')
  imgs.sideOriginal.removeAttribute('src')
  imgs.sideRestored.removeAttribute('src')
}

function openPicker() {
  if (!apiReady) {
    toast('API is offline. Start the FastAPI backend first.', 'error')
    return
  }
  fileInput.click()
}

function setDownloadEnabled(enabled: boolean) {
  downloadBtn.setAttribute('aria-disabled', String(!enabled))
  downloadBtn.classList.toggle('is-disabled', !enabled)
  if (!enabled) {
    downloadBtn.removeAttribute('href')
  }
}

function clearProgressTimers() {
  window.clearTimeout(progressTimer)
  window.clearTimeout(progressHideTimer)
}

function startProgress() {
  clearProgressTimers()
  progress.classList.add('is-on')
  progressBar.style.width = '8%'
  progressLabel.textContent = 'Detecting faces…'

  const steps = [
    { delay: 800, w: 28, label: 'Detecting faces…' },
    { delay: 2200, w: 52, label: 'Restoring facial detail…' },
    { delay: 4500, w: 74, label: 'Upscaling & blending…' },
    { delay: 8000, w: 90, label: 'Almost done…' },
  ]

  let i = 0
  const tick = () => {
    if (i >= steps.length) return
    const step = steps[i++]
    progressBar.style.width = `${step.w}%`
    progressLabel.textContent = step.label
    progressTimer = window.setTimeout(tick, step.delay)
  }
  progressTimer = window.setTimeout(tick, steps[0].delay)
}

function finishProgress(success: boolean) {
  clearProgressTimers()
  progressBar.style.width = success ? '100%' : '0%'
  progressLabel.textContent = success ? 'Complete' : 'Failed'
  progressHideTimer = window.setTimeout(() => {
    progress.classList.remove('is-on')
    progressBar.style.width = '0%'
  }, success ? 450 : 0)
}

function bindSlider() {
  unbindSlider?.()
  unbindSlider = bindCompareSlider(sliderView)
}

async function refreshHealth(opts: { silent?: boolean } = {}) {
  const requestId = ++healthRequestId
  if (!opts.silent) {
    healthEl.dataset.state = 'checking'
    healthLabel.textContent = 'Checking API…'
  }

  const result = await checkHealth()
  if (requestId !== healthRequestId) return

  apiReady = result.ok
  if (result.ok) {
    healthEl.dataset.state = 'ok'
    healthLabel.textContent = 'API online'
    if (result.version && result.upscale) {
      modelChip.textContent = `v${result.version} · ${result.upscale}×`
    }
  } else {
    healthEl.dataset.state = 'down'
    healthLabel.textContent = 'API offline'
  }
}

async function handleFile(file: File) {
  if (!isImageFile(file)) {
    toast('Use a PNG, JPEG, or WebP image.', 'error')
    return
  }
  if (!apiReady) {
    toast('API is offline. Start the backend on port 8000.', 'error')
    return
  }

  abortController?.abort()
  abortController = new AbortController()
  const signal = abortController.signal
  const requestId = ++restoreRequestId

  revokeUrls()
  clearImageSrcs()
  setDownloadEnabled(false)
  unbindSlider?.()
  unbindSlider = null

  originalUrl = URL.createObjectURL(file)
  imgs.sliderOriginal.src = originalUrl
  imgs.sideOriginal.src = originalUrl

  fileNameEl.textContent = file.name
  fileMetaEl.textContent = `${formatBytes(file.size)} · processing`
  setMode('working')
  setView('side')
  restoredFrame.classList.add('is-loading')
  pickBtn.disabled = true
  anotherBtn.disabled = true
  startProgress()

  try {
    const blob = await restoreImage(file, signal)
    if (requestId !== restoreRequestId) return

    restoredUrl = URL.createObjectURL(blob)
    imgs.sliderRestored.src = restoredUrl
    imgs.sideRestored.src = restoredUrl
    downloadBtn.href = restoredUrl
    downloadBtn.download = `${stemName(file.name)}_restored.png`
    setDownloadEnabled(true)
    fileMetaEl.textContent = `${formatBytes(file.size)} · restored`
    finishProgress(true)
    setMode('done')
    setView('slider')
    bindSlider()
    toast('Restoration complete')
  } catch (err) {
    if (requestId !== restoreRequestId) return
    if ((err as Error).name === 'AbortError' || signal.aborted) {
      clearProgressTimers()
      progress.classList.remove('is-on')
      return
    }
    finishProgress(false)
    const message = err instanceof Error ? err.message : 'Restoration failed.'
    toast(message, 'error')
    fileMetaEl.textContent = `${formatBytes(file.size)} · failed`
    setMode('done')
    setView('side')
  } finally {
    if (requestId !== restoreRequestId) return
    restoredFrame.classList.remove('is-loading')
    pickBtn.disabled = false
    anotherBtn.disabled = false
  }
}

pickBtn.addEventListener('click', openPicker)
anotherBtn.addEventListener('click', () => {
  abortController?.abort()
  restoreRequestId += 1
  clearProgressTimers()
  progress.classList.remove('is-on')
  restoredFrame.classList.remove('is-loading')
  pickBtn.disabled = false
  anotherBtn.disabled = false
  unbindSlider?.()
  unbindSlider = null
  revokeUrls()
  clearImageSrcs()
  setDownloadEnabled(false)
  fileNameEl.textContent = '—'
  fileMetaEl.textContent = ''
  setView('side')
  setMode('idle')
})

downloadBtn.addEventListener('click', (e) => {
  if (downloadBtn.getAttribute('aria-disabled') === 'true') e.preventDefault()
})

viewSliderBtn.addEventListener('click', () => {
  if (!restoredUrl) {
    toast('Wait for restoration to finish.', 'info')
    return
  }
  setView('slider')
  bindSlider()
})
viewSideBtn.addEventListener('click', () => setView('side'))

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void handleFile(file)
  fileInput.value = ''
})

let dragDepth = 0
const onDragEnter = (e: DragEvent) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth += 1
  root.classList.add('is-dragging')
}
const onDragLeave = (e: DragEvent) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) root.classList.remove('is-dragging')
}
const onDragOver = (e: DragEvent) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}
const onDrop = (e: DragEvent) => {
  e.preventDefault()
  dragDepth = 0
  root.classList.remove('is-dragging')
  const file = e.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
}

window.addEventListener('dragenter', onDragEnter)
window.addEventListener('dragleave', onDragLeave)
window.addEventListener('dragover', onDragOver)
window.addEventListener('drop', onDrop)

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    openPicker()
  }
})

void refreshHealth()
window.setInterval(() => void refreshHealth({ silent: true }), 30000)
