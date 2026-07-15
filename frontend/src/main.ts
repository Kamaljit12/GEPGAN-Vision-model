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
    <header class="site-header">
      <div class="container site-header-inner">
        <a class="logo" href="#home" aria-label="Photo Repair home">
          <span class="logo-mark" aria-hidden="true"></span>
          <span class="logo-text">Photo Repair</span>
        </a>
        <div class="header-actions">
          <button type="button" class="theme-btn" id="theme-btn" aria-label="Toggle color theme" title="Toggle theme">
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 14.5A8.5 8.5 0 119.5 3a7 7 0 0011.5 11.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="health" id="health" data-state="checking">
            <span class="health-dot" aria-hidden="true"></span>
            <span id="health-label">Checking…</span>
          </span>
        </div>
      </div>
    </header>

    <main>
      <section class="section section-hero marketing" id="home">
        <div class="container split">
          <div class="split-left" id="restore">
            <p class="eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor"/>
              </svg>
              AI POWERED FACE RESTORATION
            </p>
            <h1 class="hero-title">
              Restore faces.
              <span class="gradient-text">Reveal memories.</span>
            </h1>
            <p class="lede">
              Detects faces, restores details, and enhances image quality to bring your
              old or damaged photos back to life.
            </p>

            <button type="button" class="upload-zone" id="drop-mini">
              <span class="upload-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <strong>Drag &amp; drop an image here or click to browse</strong>
              <span>PNG, JPG, JPEG, WebP • Max 15 MB</span>
            </button>

            <div class="or-row"><span>or</span></div>

            <button type="button" class="btn btn-primary" id="pick-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
              Browse Files
            </button>

            <p class="privacy-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Your images are private and secure. We never store your photos.
            </p>
          </div>

          <div class="split-right">
            <div class="demo-slider" id="demo-slider" data-slider-root>
              <div class="demo-stage" data-slider-track>
                <img class="demo-base" src="/demo-before.jpg" alt="Before restoration" />
                <div class="demo-after" data-slider-after>
                  <img src="/demo-after.jpg" alt="After restoration" />
                </div>
                <div
                  class="demo-handle"
                  data-slider-handle
                  tabindex="0"
                  role="slider"
                  aria-label="Compare before and after"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow="50"
                >
                  <span class="demo-grip" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 7l-5 5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10 7l5 5-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </div>
                <span class="demo-tag demo-tag-before">Before</span>
                <span class="demo-tag demo-tag-after">After</span>
              </div>
            </div>
          </div>
        </div>

        <div class="container feature-strip" aria-label="Highlights">
          <div class="feature-pill">
            <span class="feature-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.5 7.5L23 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="currentColor" fill-opacity=".15"/></svg>
            </span>
            <span>Studio-quality restoration</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <span>AI face detection &amp; enhancement</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 8H4v4M16 8h4v4M8 16H4v-4M16 16h4v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/></svg>
            </span>
            <span>2× upscaling with v1.3 model</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <span>Private &amp; secure — your data is safe</span>
          </div>
        </div>
      </section>

      <section class="section section-how marketing" id="how">
        <div class="container">
          <header class="section-head">
            <p class="section-eyebrow">Simple process</p>
            <h2>How it works</h2>
            <p>Three simple steps to restore your precious memories</p>
          </header>

          <ol class="how-steps">
            <li class="how-card">
              <div class="how-card-top">
                <span class="step-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V4m0 0L8.5 7.5M12 4l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="step-num">01</span>
              </div>
              <h3>Upload</h3>
              <p>Choose a portrait or group photo. Our system securely uploads and prepares your image.</p>
            </li>

            <li class="how-arrow" aria-hidden="true">
              <span class="how-arrow-line"></span>
              <span class="how-arrow-head">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </li>

            <li class="how-card">
              <div class="how-card-top">
                <span class="step-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 4.5l1.7 4.4 4.4 1.7-4.4 1.7L15 16.7l-1.7-4.4-4.4-1.7 4.4-1.7L15 4.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                    <path d="M6.5 14.5l1.1 2.8 2.8 1.1-2.8 1.1-1.1 2.8-1.1-2.8-2.8-1.1 2.8-1.1 1.1-2.8z" fill="currentColor"/>
                  </svg>
                </span>
                <span class="step-num">02</span>
              </div>
              <h3>Restore</h3>
              <p>AI detects faces, rebuilds facial details, and enhances quality at 2× with model v1.3.</p>
            </li>

            <li class="how-arrow" aria-hidden="true">
              <span class="how-arrow-line"></span>
              <span class="how-arrow-head">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </li>

            <li class="how-card">
              <div class="how-card-top">
                <span class="step-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 5v14" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="12" r="2.75" fill="currentColor"/>
                  </svg>
                </span>
                <span class="step-num">03</span>
              </div>
              <h3>Compare &amp; Download</h3>
              <p>Use the slider to compare before and after, then download your restored image instantly.</p>
            </li>
          </ol>

          <div class="stats-card" id="stats">
            <div class="stat">
              <span class="stat-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M16.5 11a3 3 0 100-6 3 3 0 000 6zM8 11a3.25 3.25 0 100-6.5A3.25 3.25 0 008 11z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M8 13.25c-3 0-5.25 1.7-5.25 3.75V20h10.5v-3c0-2.05-2.25-3.75-5.25-3.75zM16.5 13.25c-.45 0-.88.05-1.28.14 1.45.85 2.4 2.2 2.4 3.61V20H22v-2.75c0-2.05-2.45-3.75-5.5-3.75z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="stat-copy">
                <strong>1M+ Images Restored</strong>
                <span>Trusted by users worldwide</span>
              </div>
            </div>
            <div class="stat">
              <span class="stat-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M7 11v8a1 1 0 001 1h9.4a2 2 0 001.96-1.6l1.4-7A2 2 0 0018.8 9H14V5.5A2.5 2.5 0 0011.5 3L7 11zM7 11H4.5A1.5 1.5 0 003 12.5v6A1.5 1.5 0 004.5 20H7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="stat-copy">
                <strong>98% Satisfaction Rate</strong>
                <span>Based on user feedback</span>
              </div>
            </div>
            <div class="stat">
              <span class="stat-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3.2l7 3.1v5.2c0 4.7-3.1 8.8-7 10.3-3.9-1.5-7-5.6-7-10.3V6.3l7-3.1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M9.2 12.1l1.9 1.9 3.7-3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="stat-copy">
                <strong>100% Privacy First</strong>
                <span>We never store your images</span>
              </div>
            </div>
            <div class="stat">
              <span class="stat-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4 13.5h6.5L9.5 22 20 10.5h-6.5L13 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </span>
              <div class="stat-copy">
                <strong>&lt; 10s Average Processing</strong>
                <span>Blazing fast restoration</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="drop-catch" id="dropzone" aria-hidden="true">
        <div class="drop-panel">
          <p class="drop-title">Drop photo to restore</p>
        </div>
      </div>
      <input id="file-input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden />

      <section class="section section-workspace" id="workspace">
        <div class="container">
          <div class="workspace-bar">
            <div class="file-info">
              <p class="file-name" id="file-name">—</p>
              <p class="file-meta" id="file-meta"></p>
            </div>
            <div class="toolbar" role="toolbar" aria-label="Result controls">
              <div class="seg" role="group" aria-label="Compare layout">
                <button type="button" class="seg-btn" id="view-slider" aria-pressed="false">Slider</button>
                <button type="button" class="seg-btn is-active" id="view-side" aria-pressed="true">Side by side</button>
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
                <figcaption>Restored</figcaption>
                <div class="panel-frame" id="restored-frame">
                  <img id="side-restored" alt="" />
                  <div class="panel-loader" id="panel-loader" aria-live="polite">
                    <span class="spinner" aria-hidden="true"></span>
                    <span>Restoring…</span>
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div class="toast-host" id="toast-host" aria-live="polite"></div>

    <footer class="site-footer">
      <div class="container footer-simple">
        <p class="copyright">© <span id="year"></span> Photo Repair. All rights reserved.</p>
      </div>
    </footer>
  </div>
`

const root = document.querySelector<HTMLDivElement>('#app-root')!
const pickBtn = document.querySelector<HTMLButtonElement>('#pick-btn')!
const dropMini = document.querySelector<HTMLButtonElement>('#drop-mini')!
const anotherBtn = document.querySelector<HTMLButtonElement>('#another-btn')!
const downloadBtn = document.querySelector<HTMLAnchorElement>('#download-btn')!
const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const healthEl = document.querySelector<HTMLElement>('#health')!
const healthLabel = document.querySelector<HTMLSpanElement>('#health-label')!
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
const demoSlider = document.querySelector<HTMLElement>('#demo-slider')!
const themeBtn = document.querySelector<HTMLButtonElement>('#theme-btn')!

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

const themeKey = 'photo-repair-theme'
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(themeKey, theme)
}
applyTheme(
  (localStorage.getItem(themeKey) as 'light' | 'dark' | null) ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
)
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
})

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
  if (mode === 'working' || mode === 'done') {
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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
  imgs.sideRestored.alt = ''
  imgs.sliderRestored.alt = ''
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
  if (!enabled) downloadBtn.removeAttribute('href')
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
    healthLabel.textContent = 'Checking…'
  }
  const result = await checkHealth()
  if (requestId !== healthRequestId) return
  apiReady = result.ok
  if (result.ok) {
    healthEl.dataset.state = 'ok'
    healthLabel.textContent = 'Online'
  } else {
    healthEl.dataset.state = 'down'
    healthLabel.textContent = 'Offline'
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
    imgs.sliderRestored.alt = 'Restored'
    imgs.sideRestored.src = restoredUrl
    imgs.sideRestored.alt = 'Restored image'
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
    toast(err instanceof Error ? err.message : 'Restoration failed.', 'error')
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
dropMini.addEventListener('click', openPicker)
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
  document.querySelector('#home')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth += 1
  root.classList.add('is-dragging')
})
window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) root.classList.remove('is-dragging')
})
window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
})
window.addEventListener('drop', (e) => {
  e.preventDefault()
  dragDepth = 0
  root.classList.remove('is-dragging')
  const file = e.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
})

bindCompareSlider(demoSlider)
void refreshHealth()
window.setInterval(() => void refreshHealth({ silent: true }), 30000)

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())
