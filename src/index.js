import './styles/main.scss'
import * as THREE from 'three'

// Импортируем картинки, чтобы Webpack их подхватил
import v1 from './images/v1.jpg'
import h1 from './images/h1.jpg'

// === 1. Three.js сцена ===
const canvas = document.querySelector('#canvas')
const lightOverlay = document.querySelector('.O_LightOverlay img')
const limitsBlock = document.querySelector('.O_LimitsBlock')

const scene = new THREE.Scene()
const bgWhite = new THREE.Color(0xffffff)
const bgDark = new THREE.Color(0x0c0c0c)
scene.background = bgWhite.clone()

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(0, 0, 24)

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace

const ambient = new THREE.AmbientLight(0xffffff, 1.6)
scene.add(ambient)

const filmGroup = new THREE.Group()
scene.add(filmGroup)

const verticalUrls = [v1, v1, v1, v1, v1, v1]
const horizontalUrls = [h1, h1, h1, h1, h1, h1]

const loader = new THREE.TextureLoader()
loader.crossOrigin = 'anonymous'

const verticalWidth = 7.5
const verticalHeight = 11.2
const horizontalWidth = 7.5
const horizontalHeight = 5.0

const verticalGeometry = new THREE.PlaneGeometry(verticalWidth, verticalHeight)
const horizontalGeometry = new THREE.PlaneGeometry(
  horizontalWidth,
  horizontalHeight
)

const totalPosters = 16
const posters = []
const KEEP_INDICES = [0, 3, 6, 9, 12]

let verticalIndex = 0
let horizontalIndex = 0

for (let i = 0; i < totalPosters; i++) {
  const isVertical = i % 2 === 0
  let texture
  let geometry

  if (isVertical) {
    texture = loader.load(verticalUrls[verticalIndex % verticalUrls.length])
    geometry = verticalGeometry
    verticalIndex++
  } else {
    texture = loader.load(
      horizontalUrls[horizontalIndex % horizontalUrls.length]
    )
    geometry = horizontalGeometry
    horizontalIndex++
  }

  texture.colorSpace = THREE.SRGBColorSpace

  const posterMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true
  })

  const poster = new THREE.Mesh(geometry, posterMaterial)
  const posterGroup = new THREE.Group()
  posterGroup.add(poster)

  const angle = i * 0.75
  const radius = 17
  const y = (i - totalPosters / 2) * 1.9

  posterGroup.position.set(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  )
  posterGroup.rotation.y = -angle + Math.PI / 2
  posterGroup.rotation.z = Math.sin(i * 0.8) * 0.08

  posterGroup.userData = {
    index: i,
    angle,
    baseY: y,
    radius,
    isVertical,
    keep: KEEP_INDICES.includes(i),
    nativeW: isVertical ? verticalWidth : horizontalWidth,
    nativeH: isVertical ? verticalHeight : horizontalHeight
  }

  filmGroup.add(posterGroup)
  posters.push(posterGroup)
}

filmGroup.position.y = 0

const BASE_LAYOUT = [
  { x: -11.33, y: -4.0, z: 0.0, w: 7.3, h: 9.2 },
  { x: -8.83, y: 2.0, z: 0.2, w: 7.2, h: 4.6 },
  { x: 2.97, y: 4.4, z: 0.4, w: 4.7, h: 6.2 },
  { x: 0.37, y: -9.2, z: 0.6, w: 4.7, h: 3.2 },
  { x: 10.77, y: -8.7, z: 0.8, w: 4.7, h: 6.1 }
]

const LEFT_MARGIN_PX = 56
const TOP_MARGIN_PX = 18
const RIGHT_MARGIN_PX = 15

function getFinalLayout(cameraZ, fovDeg) {
  const aspect = window.innerWidth / window.innerHeight
  const viewportH = 2 * cameraZ * Math.tan((fovDeg * Math.PI) / 360)
  const viewportW = viewportH * aspect
  const pxToWorld = viewportW / window.innerWidth
  const leftMarginW = LEFT_MARGIN_PX * pxToWorld
  const topMarginW = TOP_MARGIN_PX * pxToWorld
  const rightMarginW = RIGHT_MARGIN_PX * pxToWorld
  const targetLeftEdge = -viewportW / 2 + leftMarginW
  const targetRightEdge = viewportW / 2 - rightMarginW
  const targetTopEdge = viewportH / 2 - topMarginW

  let minLeft = Infinity
  let maxRight = -Infinity
  let maxTop = -Infinity
  BASE_LAYOUT.forEach((p) => {
    const l = p.x - p.w / 2
    const r = p.x + p.w / 2
    const t = p.y + p.h / 2
    if (l < minLeft) minLeft = l
    if (r > maxRight) maxRight = r
    if (t > maxTop) maxTop = t
  })

  let shiftX = targetLeftEdge - minLeft
  const newRight = maxRight + shiftX
  if (newRight > targetRightEdge) {
    shiftX = targetRightEdge - maxRight
  }
  const shiftY = targetTopEdge - maxTop

  return BASE_LAYOUT.map((p) => ({
    x: p.x + shiftX,
    y: p.y + shiftY,
    z: p.z,
    w: p.w,
    h: p.h
  }))
}

let FINAL_LAYOUT = getFinalLayout(18, 60)

function getFinalTransform(keepSlot) {
  return FINAL_LAYOUT[keepSlot]
}

const keepSlotMap = new Map()
KEEP_INDICES.forEach((idx, slot) => keepSlotMap.set(idx, slot))

let scrollProgress = 0
let targetScrollProgress = 0

const SPIRAL_END = 0.6
const FINAL_START = 0.6
const FINAL_END = 0.8

function updateScroll() {
  const block = document.querySelector('.O_AnimationBlock')
  const rect = block.getBoundingClientRect()
  const blockTop = rect.top + window.scrollY
  const blockHeight = block.offsetHeight
  const maxScroll = blockHeight - window.innerHeight
  const localScroll = window.scrollY - blockTop
  targetScrollProgress =
    maxScroll > 0 ? Math.max(0, Math.min(1, localScroll / maxScroll)) : 0
}

window.addEventListener('scroll', updateScroll, { passive: true })
updateScroll()

const clock = new THREE.Clock()
const easeInOut = (t) => {
  t = Math.max(0, Math.min(1, t))
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function animate() {
  const time = clock.getElapsedTime()
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.075

  const spiralP = Math.min(scrollProgress / SPIRAL_END, 1)
  const finalP = easeInOut(
    (scrollProgress - FINAL_START) / (FINAL_END - FINAL_START)
  )

  const bgP = Math.max(0, Math.min(1, (finalP - 0.7) / 0.3))
  scene.background.copy(bgWhite).lerp(bgDark, bgP)

  if (lightOverlay) {
    const lightP = Math.max(0, Math.min(1, (finalP - 0.85) / 0.15))
    lightOverlay.style.opacity = String(lightP)
  }
  if (limitsBlock) {
    const limitsP = Math.max(0, Math.min(1, (finalP - 0.9) / 0.1))
    limitsBlock.style.opacity = String(limitsP)
  }

  filmGroup.rotation.y = spiralP * Math.PI * 1.25 + time * 0.08 * (1 - finalP)
  filmGroup.rotation.z = spiralP * Math.PI * 0.1 * (1 - finalP)
  filmGroup.position.y = spiralP * 4.5 - 2.2 - 3.5 * (1 - spiralP)

  posters.forEach((poster) => {
    const { index, angle, baseY, radius, keep, nativeW, nativeH } =
      poster.userData
    const spiralRadius =
      radius -
      spiralP * 1.8 +
      Math.sin(index * 0.45 + time * 0.45) * 0.1 * (1 - finalP)
    const movingAngle = angle + spiralP * Math.PI * 0.4
    const spiralX = Math.cos(movingAngle) * spiralRadius
    const spiralZ = Math.sin(movingAngle) * spiralRadius
    const spiralY = baseY + spiralP * (index - totalPosters / 2) * 0.08
    const spiralRotY = -movingAngle + Math.PI / 2
    const spiralRotZ = poster.rotation.z

    if (keep) {
      const slot = keepSlotMap.get(index)
      const t = getFinalTransform(slot)
      const worldFinal = new THREE.Vector3(t.x, t.y, t.z)
      const groupQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          filmGroup.rotation.x,
          filmGroup.rotation.y,
          filmGroup.rotation.z
        )
      )
      const invQuat = groupQuat.clone().invert()
      const localFinal = worldFinal
        .clone()
        .applyQuaternion(invQuat)
        .sub(filmGroup.position.clone().applyQuaternion(invQuat))

      poster.position.x = THREE.MathUtils.lerp(spiralX, localFinal.x, finalP)
      poster.position.y = THREE.MathUtils.lerp(spiralY, localFinal.y, finalP)
      poster.position.z = THREE.MathUtils.lerp(spiralZ, localFinal.z, finalP)

      poster.rotation.y = THREE.MathUtils.lerp(
        spiralRotY,
        -filmGroup.rotation.y,
        finalP
      )
      poster.rotation.z = THREE.MathUtils.lerp(spiralRotZ, 0, finalP)

      const targetScaleX = t.w / nativeW
      const targetScaleY = t.h / nativeH
      const sx = THREE.MathUtils.lerp(1, targetScaleX, finalP)
      const sy = THREE.MathUtils.lerp(1, targetScaleY, finalP)
      poster.scale.set(sx, sy, 1)
      poster.children[0].material.opacity = 1
    } else {
      poster.position.x = spiralX
      poster.position.y = spiralY
      poster.position.z = spiralZ
      poster.rotation.y = spiralRotY
      const opacity = 1 - finalP
      poster.children[0].material.opacity = opacity
      const s = 1 - finalP * 0.35
      poster.scale.set(s, s, 1)
      poster.position.x += finalP * Math.cos(index) * 4
      poster.position.y += finalP * 2.5
    }
  })

  const camZ = THREE.MathUtils.lerp(24, 20, spiralP)
  camera.position.z = THREE.MathUtils.lerp(camZ, 18, finalP)
  const camBaseY = 1
  camera.position.y = THREE.MathUtils.lerp(camBaseY, 0.5, finalP)
  camera.lookAt(0, camBaseY * (1 - finalP) + 0.8 * finalP, 0)

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  FINAL_LAYOUT = getFinalLayout(18, 60)
})

// === 2. Reveal-анимации ===
const revealEls = document.querySelectorAll('[data-reveal]')
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    })
  },
  { threshold: 0, rootMargin: '0px 0px 0px 0px' }
)
revealEls.forEach((el) => io.observe(el))

// === 3. Падение диска ===
const disk = document.querySelector('.Q_Disk')
const secondBlock = document.querySelector('.O_SecondBlock')

function updateDiskFall() {
  if (!disk || !secondBlock) return
  const vh = window.innerHeight
  const rect = secondBlock.getBoundingClientRect()
  const progress = Math.max(0, Math.min(1, 1 - rect.top / vh))
  const baseY = -3.958 * (window.innerWidth / 100)
  const startOffset = -250
  const offsetY = startOffset * (1 - progress)
  disk.style.transform = `translateY(calc(${baseY}px + ${offsetY}vh))`
}

window.addEventListener('scroll', () => updateDiskFall(), { passive: true })
window.addEventListener('resize', updateDiskFall)
updateDiskFall()

// === 4. Параллакс ===
const parallaxEls = document.querySelectorAll('.has-parallax')
let parallaxRaf = null

function updateParallax() {
  const vh = window.innerHeight
  parallaxEls.forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > vh) return
    const center = r.top + r.height / 2
    const ratio = (center - vh / 2) / vh
    el.style.transform = `translateY(${ratio * 30}px)`
  })
  parallaxRaf = null
}

window.addEventListener(
  'scroll',
  () => {
    if (!parallaxRaf) parallaxRaf = requestAnimationFrame(updateParallax)
  },
  { passive: true }
)
updateParallax()
