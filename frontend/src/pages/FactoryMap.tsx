import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { 
  Activity, 
  ArrowRight, 
  X, 
  Layers, 
  Compass, 
  Shield, 
  Zap, 
  Thermometer, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  RotateCcw,
  Sparkles,
  Maximize2,
  Tag
} from 'lucide-react'

interface Machine {
  id: number
  name: string
  type: string
  status: string
  health_score: number
}

// 4 Industrial Manufacturing Zones on the factory floor
const FACTORY_ZONES = [
  { name: 'Zone A - Precision CNC Machining', code: 'BAY-A', color: '#06b6d4', xMin: -35, xMax: -5, zMin: -30, zMax: 0 },
  { name: 'Zone B - Heavy Stamping & Pressing', code: 'BAY-B', color: '#8b5cf6', xMin: 5, xMax: 35, zMin: -30, zMax: 0 },
  { name: 'Zone C - Automated Assembly & Robotics', code: 'BAY-C', color: '#3b82f6', xMin: -35, xMax: -5, zMin: 5, zMax: 35 },
  { name: 'Zone D - Utilities, Pumps & Boilers', code: 'BAY-D', color: '#f59e0b', xMin: 5, xMax: 35, zMin: 5, zMax: 35 },
]

// Determine 3D coordinates based on machine type and ID to cluster into realistic factory bays
const getMachine3DPosition = (machine: Machine, index: number): [number, number, number] => {
  const typeLower = (machine.type || '').toLowerCase()
  let bay = FACTORY_ZONES[0] // default Bay A

  if (typeLower.includes('press') || typeLower.includes('stamping') || typeLower.includes('molding')) {
    bay = FACTORY_ZONES[1] // Bay B
  } else if (typeLower.includes('welding') || typeLower.includes('robot') || typeLower.includes('assembly') || typeLower.includes('cutting')) {
    bay = FACTORY_ZONES[2] // Bay C
  } else if (typeLower.includes('compressor') || typeLower.includes('pump') || typeLower.includes('boiler') || typeLower.includes('fan') || typeLower.includes('gas')) {
    bay = FACTORY_ZONES[3] // Bay D
  } else {
    bay = FACTORY_ZONES[0] // Bay A (Lathes, Milling, Grinding)
  }

  // Position within the bay on a neat industrial grid
  const slot = index % 4
  const col = slot % 2
  const row = Math.floor(slot / 2)

  const x = bay.xMin + 7 + col * 16
  const z = bay.zMin + 7 + row * 16
  return [x, 0, z]
}

export const FactoryMap: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [hoveredMachine, setHoveredMachine] = useState<Machine | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // View & Layer Controls
  const [showZones, setShowZones] = useState(true)
  const [showBeacons, setShowBeacons] = useState(true)
  const [showParticles, setShowParticles] = useState(true)
  const [showBanners, setShowBanners] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL')

  const showBannersRef = useRef(true)
  showBannersRef.current = showBanners

  const statusFilterRef = useRef<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL')
  statusFilterRef.current = statusFilter

  const machinesRef = useRef<Machine[]>([])
  machinesRef.current = machines

  const bannerElementsRef = useRef<Map<number, HTMLDivElement>>(new Map())

  // Three.js object references for dynamic manipulation
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const machineMeshMap = useRef<Map<number, THREE.Group>>(new Map())
  const beaconGroupRef = useRef<THREE.Group | null>(null)
  const zoneGroupRef = useRef<THREE.Group | null>(null)
  const particleSystemRef = useRef<THREE.Points | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const targetCamPos = useRef<THREE.Vector3 | null>(null)
  const targetCamLookAt = useRef<THREE.Vector3 | null>(null)

  // Fetch live machine fleet
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/machines/')
        if (res.ok) {
          const data = await res.json()
          setMachines(data)
        }
      } catch (error) {
        console.error('Failed to fetch machines for 3D map:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMachines()
  }, [])

  // Fleet Statistics
  const stats = useMemo(() => {
    const total = machines.length
    const healthy = machines.filter(m => (m.health_score ?? 100) >= 80).length
    const warning = machines.filter(m => (m.health_score ?? 100) >= 60 && (m.health_score ?? 100) < 80).length
    const critical = machines.filter(m => (m.health_score ?? 100) < 60).length
    const avgHealth = total > 0 ? (machines.reduce((acc, m) => acc + (m.health_score ?? 100), 0) / total).toFixed(1) : '100'
    return { total, healthy, warning, critical, avgHealth }
  }, [machines])

  // ==========================================
  // THREE.JS 3D SCENE SETUP & ENGINE
  // ==========================================
  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1d) // Deep industrial slate
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.009)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500)
    camera.position.set(0, 48, 65)
    cameraRef.current = camera

    // 3. Renderer with high visual fidelity
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // Don't clip below floor
    controls.minDistance = 12
    controls.maxDistance = 130
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // 5. Lighting
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8)
    scene.add(ambientLight)

    // Directional main sun/high-bay industrial light
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2)
    dirLight.position.set(30, 60, 40)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 10
    dirLight.shadow.camera.far = 150
    dirLight.shadow.camera.left = -50
    dirLight.shadow.camera.right = 50
    dirLight.shadow.camera.top = 50
    dirLight.shadow.camera.bottom = -50
    dirLight.shadow.bias = -0.0005
    scene.add(dirLight)

    // Secondary cyan high-tech rim light
    const cyanLight = new THREE.DirectionalLight(0x06b6d4, 1.2)
    cyanLight.position.set(-40, 30, -30)
    scene.add(cyanLight)

    // Subtle purple overhead accent
    const purpleLight = new THREE.PointLight(0x8b5cf6, 1.5, 80)
    purpleLight.position.set(0, 25, 0)
    scene.add(purpleLight)

    // ==========================================
    // 6. Realistic Industrial Factory Architecture
    // ==========================================
    // Factory concrete floor
    const floorGeo = new THREE.PlaneGeometry(100, 90)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Floor Grid Lines
    const gridHelper = new THREE.GridHelper(90, 45, 0x38bdf8, 0x1e293b)
    gridHelper.position.y = 0.02
    scene.add(gridHelper)

    // Factory Safety Walkways (Central Cross roads)
    const walkwayMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 })
    
    // Horizontal main corridor
    const walkH = new THREE.Mesh(new THREE.PlaneGeometry(90, 4), walkwayMat)
    walkH.rotation.x = -Math.PI / 2
    walkH.position.set(0, 0.03, 2.5)
    scene.add(walkH)

    // Vertical main corridor
    const walkV = new THREE.Mesh(new THREE.PlaneGeometry(4, 80), walkwayMat)
    walkV.rotation.x = -Math.PI / 2
    walkV.position.set(0, 0.03, 2.5)
    scene.add(walkV)

    // Hazard Border lines (Dotted / striped perimeter borders)
    const borderLinesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(86, 0.1, 76))
    const borderLinesMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.4 })
    const borderBox = new THREE.LineSegments(borderLinesGeo, borderLinesMat)
    borderBox.position.set(0, 0.05, 2.5)
    scene.add(borderBox)

    // Structural Factory Columns / Girders
    const columnGeo = new THREE.BoxGeometry(1.2, 22, 1.2)
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
    const columnPositions = [
      [-42, 11, -37], [42, 11, -37],
      [-42, 11, 40], [42, 11, 40],
      [-42, 11, 2], [42, 11, 2]
    ]
    columnPositions.forEach(([cx, cy, cz]) => {
      const colMesh = new THREE.Mesh(columnGeo, columnMat)
      colMesh.position.set(cx, cy, cz)
      colMesh.castShadow = true
      scene.add(colMesh)

      // Column base cap
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 2), new THREE.MeshStandardMaterial({ color: 0x334155 }))
      baseMesh.position.set(cx, 0.4, cz)
      scene.add(baseMesh)
    })

    // Roof Truss Girders spanning across
    const trussMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true })
    const trussGeo = new THREE.BoxGeometry(84, 1.5, 1.5)
    const truss1 = new THREE.Mesh(trussGeo, trussMat)
    truss1.position.set(0, 21.5, -37)
    scene.add(truss1)
    const truss2 = new THREE.Mesh(trussGeo, trussMat)
    truss2.position.set(0, 21.5, 2)
    scene.add(truss2)
    const truss3 = new THREE.Mesh(trussGeo, trussMat)
    truss3.position.set(0, 21.5, 40)
    scene.add(truss3)

    // Manufacturing Zones Group
    const zoneGroup = new THREE.Group()
    FACTORY_ZONES.forEach(z => {
      const zWidth = z.xMax - z.xMin
      const zDepth = z.zMax - z.zMin
      const centerX = (z.xMin + z.xMax) / 2
      const centerZ = (z.zMin + z.zMax) / 2

      // Subtle glowing floor zone boundary
      const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(zWidth, 0.05, zDepth))
      const outlineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(z.color), transparent: true, opacity: 0.6 })
      const outlineMesh = new THREE.LineSegments(outlineGeo, outlineMat)
      outlineMesh.position.set(centerX, 0.04, centerZ)
      zoneGroup.add(outlineMesh)

      // Zone Corner Markers
      const cornerGeo = new THREE.BoxGeometry(0.8, 0.2, 0.8)
      const cornerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(z.color) })
      const c1 = new THREE.Mesh(cornerGeo, cornerMat); c1.position.set(z.xMin + 0.4, 0.1, z.zMin + 0.4); zoneGroup.add(c1)
      const c2 = new THREE.Mesh(cornerGeo, cornerMat); c2.position.set(z.xMax - 0.4, 0.1, z.zMin + 0.4); zoneGroup.add(c2)
      const c3 = new THREE.Mesh(cornerGeo, cornerMat); c3.position.set(z.xMin + 0.4, 0.1, z.zMax - 0.4); zoneGroup.add(c3)
      const c4 = new THREE.Mesh(cornerGeo, cornerMat); c4.position.set(z.xMax - 0.4, 0.1, z.zMax - 0.4); zoneGroup.add(c4)
    })
    scene.add(zoneGroup)
    zoneGroupRef.current = zoneGroup

    // Beacons Group
    const beaconGroup = new THREE.Group()
    scene.add(beaconGroup)
    beaconGroupRef.current = beaconGroup

    // 7. Ambient Telemetry Data Particles
    const particleCount = 200
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSpeeds = new Float32Array(particleCount)

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 80
      particlePositions[p * 3 + 1] = Math.random() * 20
      particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 70
      particleSpeeds[p] = 0.02 + Math.random() * 0.03
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    const particleSystem = new THREE.Points(particleGeo, particleMat)
    scene.add(particleSystem)
    particleSystemRef.current = particleSystem

    // 8. Animation & Render Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Smooth camera interpolation when a machine is focused
      if (targetCamPos.current && targetCamLookAt.current) {
        camera.position.lerp(targetCamPos.current, 0.05)
        controls.target.lerp(targetCamLookAt.current, 0.05)
        if (camera.position.distanceTo(targetCamPos.current) < 0.2) {
          targetCamPos.current = null
          targetCamLookAt.current = null
        }
      }

      // Animate floating telemetry particles
      if (particleSystemRef.current && showParticles) {
        const positions = particleGeo.attributes.position.array as Float32Array
        for (let p = 0; p < particleCount; p++) {
          positions[p * 3 + 1] += particleSpeeds[p]
          if (positions[p * 3 + 1] > 20) {
            positions[p * 3 + 1] = 0.2
          }
        }
        particleGeo.attributes.position.needsUpdate = true
      }

      // Pulse holographic beacons
      if (beaconGroupRef.current) {
        beaconGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const scalePulse = 1 + 0.15 * Math.sin(elapsedTime * 3 + child.id)
            child.scale.set(scalePulse, scalePulse, 1)
          }
        })
      }

      // 3D-to-2D Projection for Floating Machine Banners
      if (camera && container) {
        if (!showBannersRef.current) {
          bannerElementsRef.current.forEach((el) => {
            if (el) el.style.display = 'none'
          })
        } else {
          const width = container.clientWidth
          const height = container.clientHeight
          const tempVec = new THREE.Vector3()
          const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

          machinesRef.current.forEach((m, idx) => {
            const el = bannerElementsRef.current.get(m.id)
            if (!el) return

            // Filter visibility check
            const health = m.health_score ?? 100
            const isH = health >= 80
            const isW = health >= 60 && health < 80
            const filter = statusFilterRef.current
            const matches =
              filter === 'ALL' ||
              (filter === 'HEALTHY' && isH) ||
              (filter === 'WARNING' && isW) ||
              (filter === 'CRITICAL' && !isH && !isW)

            if (!matches) {
              el.style.display = 'none'
              return
            }

            const [mx, my, mz] = getMachine3DPosition(m, idx)
            const typeLower = (m.type || '').toLowerCase()
            const heightOffset = typeLower.includes('press') ? 11.2 : (typeLower.includes('boiler') || typeLower.includes('robot') ? 9.6 : 7.2)

            tempVec.set(mx, my + heightOffset, mz)
            const distToCam = camera.position.distanceTo(tempVec)

            // Occlusion: Check if point is behind camera plane
            const toPoint = tempVec.clone().sub(camera.position).normalize()
            if (camDir.dot(toPoint) <= 0.05) {
              el.style.display = 'none'
              return
            }

            tempVec.project(camera)

            if (tempVec.z > 1.0) {
              el.style.display = 'none'
              return
            }

            const sx = ((tempVec.x + 1) * width) / 2
            const sy = ((-tempVec.y + 1) * height) / 2

            // Viewport boundary margin
            if (sx < -160 || sx > width + 160 || sy < -120 || sy > height + 120) {
              el.style.display = 'none'
              return
            }

            el.style.display = 'flex'
            const scale = Math.max(0.68, Math.min(1.05, 42 / distToCam))
            el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%) scale(${scale})`
            el.style.zIndex = `${Math.round(1000 - distToCam)}`
          })
        }
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const newW = container.clientWidth
      const newH = container.clientHeight
      camera.aspect = newW / newH
      camera.updateProjectionMatrix()
      renderer.setSize(newW, newH)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Toggle Visibility of Layers
  useEffect(() => {
    if (zoneGroupRef.current) zoneGroupRef.current.visible = showZones
  }, [showZones])

  useEffect(() => {
    if (beaconGroupRef.current) beaconGroupRef.current.visible = showBeacons
  }, [showBeacons])

  useEffect(() => {
    if (particleSystemRef.current) particleSystemRef.current.visible = showParticles
  }, [showParticles])

  // ==========================================
  // PROCEDURAL 3D INDUSTRIAL MACHINES GENERATOR
  // ==========================================
  useEffect(() => {
    const scene = sceneRef.current
    const beaconGroup = beaconGroupRef.current
    if (!scene || !beaconGroup) return

    // Clear previous machine meshes
    machineMeshMap.current.forEach(mesh => scene.remove(mesh))
    machineMeshMap.current.clear()

    while (beaconGroup.children.length > 0) {
      beaconGroup.remove(beaconGroup.children[0])
    }

    if (machines.length === 0) return

    // Reusable Materials
    const steelBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    const castIronMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.4 })
    const chromePillarMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.1 })
    const safetyEnclosureGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.4,
      transmission: 0.6,
      ior: 1.5
    })
    const warningYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })

    machines.forEach((machine, idx) => {
      const [posX, posY, posZ] = getMachine3DPosition(machine, idx)
      const health = machine.health_score ?? 100
      const isHealthy = health >= 80
      const isWarning = health >= 60 && health < 80
      const statusColorHex = isHealthy ? 0x10b981 : isWarning ? 0xf59e0b : 0xef4444

      const matchesFilter = 
        statusFilter === 'ALL' ||
        (statusFilter === 'HEALTHY' && isHealthy) ||
        (statusFilter === 'WARNING' && isWarning) ||
        (statusFilter === 'CRITICAL' && !isHealthy && !isWarning)

      if (!matchesFilter) return

      const machineGroup = new THREE.Group()
      machineGroup.position.set(posX, posY, posZ)
      machineGroup.userData = { machine, originalY: posY }

      const typeLower = (machine.type || '').toLowerCase()

      // ----------------------------------------------------
      // MODEL A: HEAVY HYDRAULIC PRESS (Gamma, Stamping, etc.)
      // ----------------------------------------------------
      if (typeLower.includes('press') || typeLower.includes('stamping')) {
        // Massive Bottom Bolster Bed
        const bed = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 5), castIronMat)
        bed.position.y = 0.6
        bed.castShadow = true
        machineGroup.add(bed)

        // 4 Chrome Tie-Rod Columns
        const columnGeo = new THREE.CylinderGeometry(0.25, 0.25, 6, 16)
        const offsets = [[-2.4, -1.9], [2.4, -1.9], [-2.4, 1.9], [2.4, 1.9]]
        offsets.forEach(([ox, oz]) => {
          const col = new THREE.Mesh(columnGeo, chromePillarMat)
          col.position.set(ox, 4.2, oz)
          col.castShadow = true
          machineGroup.add(col)
        })

        // Upper Crown Frame
        const crown = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.8, 5.2), steelBaseMat)
        crown.position.y = 7.8
        crown.castShadow = true
        machineGroup.add(crown)

        // Hydraulic Power Cylinder on Top
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.5, 24), steelBaseMat)
        cylinder.position.y = 9.8
        cylinder.castShadow = true
        machineGroup.add(cylinder)

        // Press Ram Platen (Tool head)
        const ram = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 4), steelBaseMat)
        ram.position.y = 4.8
        ram.castShadow = true
        machineGroup.add(ram)

      // ----------------------------------------------------
      // MODEL B: ROBOTIC WELDING CELL (Zeta, Assembly, etc.)
      // ----------------------------------------------------
      } else if (typeLower.includes('welding') || typeLower.includes('robot')) {
        // Circular Rotating Pedestal
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.8, 24), castIronMat)
        base.position.y = 0.4
        base.castShadow = true
        machineGroup.add(base)

        // Turntable joint
        const joint1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), warningYellowMat)
        joint1.position.y = 1.6
        machineGroup.add(joint1)

        // Lower Articulated Arm
        const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.8, 0.8), steelBaseMat)
        lowerArm.position.set(0.6, 3.2, 0)
        lowerArm.rotation.z = -0.3
        lowerArm.castShadow = true
        machineGroup.add(lowerArm)

        // Elbow Joint
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), warningYellowMat)
        elbow.position.set(1.2, 5.0, 0)
        machineGroup.add(elbow)

        // Forearm extending down to workpiece
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), steelBaseMat)
        forearm.position.set(2.4, 4.2, 0)
        forearm.rotation.z = 0.6
        forearm.castShadow = true
        machineGroup.add(forearm)

        // End-Effector Welding Torch Tool
        const torch = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 16), chromePillarMat)
        torch.position.set(3.4, 2.6, 0)
        torch.rotation.z = Math.PI
        machineGroup.add(torch)

        // Safety Guard Fence around cell
        const fenceGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 3, 6))
        const fenceMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 })
        const fence = new THREE.LineSegments(fenceGeo, fenceMat)
        fence.position.y = 1.5
        machineGroup.add(fence)

      // ----------------------------------------------------
      // MODEL C: INDUSTRIAL COMPRESSOR / PUMP / BOILER
      // ----------------------------------------------------
      } else if (typeLower.includes('compressor') || typeLower.includes('pump') || typeLower.includes('boiler')) {
        // Concrete Equipment Foundation Pad
        const pad = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 4), castIronMat)
        pad.position.y = 0.2
        machineGroup.add(pad)

        // Main Cylindrical Pressure Tank
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.8, 24), steelBaseMat)
        tank.rotation.z = Math.PI / 2
        tank.position.set(0, 2.2, -0.4)
        tank.castShadow = true
        machineGroup.add(tank)

        // Electric Drive Motor
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 20), warningYellowMat)
        motor.rotation.z = Math.PI / 2
        motor.position.set(0, 1.4, 1.2)
        motor.castShadow = true
        machineGroup.add(motor)

        // Heavy Flanged Vertical Exhaust / Manifold Flue
        const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 4, 16), chromePillarMat)
        flue.position.set(1.5, 4.2, -0.4)
        flue.castShadow = true
        machineGroup.add(flue)

        // Pressure Gauge Dial
        const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
        gauge.rotation.x = Math.PI / 2
        gauge.position.set(-1.8, 3.2, 0.4)
        machineGroup.add(gauge)

      // ----------------------------------------------------
      // MODEL D: PRECISION CNC LATHE / MILLING / MACHINING
      // ----------------------------------------------------
      } else {
        // Heavy Cast Bed Chassis
        const bed = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.6, 3.8), castIronMat)
        bed.position.y = 0.8
        bed.castShadow = true
        machineGroup.add(bed)

        // Tinted Glass Protective Enclosure Cabinet
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 3.2), safetyEnclosureGlassMat)
        cabinet.position.set(0, 3.2, 0)
        machineGroup.add(cabinet)

        // Steel Frame for Cabinet
        const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.8, 3.2, 3.2))
        const frameMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
        const cabinetFrame = new THREE.LineSegments(frameGeo, frameMat)
        cabinetFrame.position.set(0, 3.2, 0)
        machineGroup.add(cabinetFrame)

        // Spindle Chuck / Workhead inside
        const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 20), chromePillarMat)
        chuck.rotation.z = Math.PI / 2
        chuck.position.set(-1.4, 2.6, 0)
        machineGroup.add(chuck)

        // CNC Operator Control Pendant Touch Console
        const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x06b6d4 }))
        pendant.position.set(2.8, 3.4, 1.4)
        machineGroup.add(pendant)
      }

      // ----------------------------------------------------
      // HOLOGRAPHIC STATUS BEACONS & ILLUMINATION
      // ----------------------------------------------------
      // Floor Holographic Status Ring
      const ringGeo = new THREE.RingGeometry(3.2, 3.8, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: statusColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = -Math.PI / 2
      ringMesh.position.set(posX, 0.05, posZ)
      beaconGroup.add(ringMesh)

      // Vertical Laser Scan Light Column
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.8, 8, 16, 1, true)
      const beamMat = new THREE.MeshBasicMaterial({
        color: statusColorHex,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const beamMesh = new THREE.Mesh(beamGeo, beamMat)
      beamMesh.position.set(posX, 4.0, posZ)
      beaconGroup.add(beamMesh)

      // Status Beacon Light Point
      const beaconLight = new THREE.PointLight(statusColorHex, isHealthy ? 1.0 : 2.5, 12)
      beaconLight.position.set(posX, 7.5, posZ)
      beaconGroup.add(beaconLight)

      // Add to scene and register in mesh map
      scene.add(machineGroup)
      machineMeshMap.current.set(machine.id, machineGroup)
    })
  }, [machines, statusFilter])

  // Machine Selection & Camera Focus Handler
  const focusAndSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine)
    const meshGroup = machineMeshMap.current.get(machine.id)
    if (meshGroup) {
      const [mx, my, mz] = meshGroup.position.toArray()
      targetCamLookAt.current = new THREE.Vector3(mx, my + 3, mz)
      targetCamPos.current = new THREE.Vector3(mx + 14, my + 14, mz + 18)
    }
  }

  // ==========================================
  // RAYCASTING: HOVER & CLICK SELECTION
  // ==========================================
  useEffect(() => {
    const container = mountRef.current
    if (!container || !cameraRef.current || !sceneRef.current) return

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    let downX = 0
    let downY = 0
    let downTime = 0

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, cameraRef.current!)
      
      const interactiveGroups: THREE.Object3D[] = []
      machineMeshMap.current.forEach(group => interactiveGroups.push(group))

      const intersects = raycaster.intersectObjects(interactiveGroups, true)

      if (intersects.length > 0) {
        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object
          while (curr && curr !== sceneRef.current) {
            if (curr.userData && curr.userData.machine) {
              container.style.cursor = 'pointer'
              setHoveredMachine(curr.userData.machine)
              setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              return
            }
            curr = curr.parent
          }
        }
      }

      container.style.cursor = 'default'
      setHoveredMachine(null)
      setHoverPos(null)
    }

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      downTime = Date.now()
    }

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
      const duration = Date.now() - downTime
      // If pointer moved more than 8px or held longer than 450ms, it was an orbit drag, not a click
      if (dist > 8 || duration > 450) return

      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, cameraRef.current!)
      const interactiveGroups: THREE.Object3D[] = []
      machineMeshMap.current.forEach(group => interactiveGroups.push(group))

      const intersects = raycaster.intersectObjects(interactiveGroups, true)
      if (intersects.length > 0) {
        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object
          while (curr && curr !== sceneRef.current) {
            if (curr.userData && curr.userData.machine) {
              focusAndSelectMachine(curr.userData.machine)
              return
            }
            curr = curr.parent
          }
        }
      }
    }

    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointerup', onPointerUp)

    return () => {
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  // Camera Presets
  const setCameraView = (type: 'ISOMETRIC' | 'TOP_DOWN' | 'WALKWAY' | 'RESET') => {
    if (!cameraRef.current || !controlsRef.current) return
    const controls = controlsRef.current

    if (type === 'ISOMETRIC') {
      targetCamLookAt.current = new THREE.Vector3(0, 0, 0)
      targetCamPos.current = new THREE.Vector3(38, 42, 48)
    } else if (type === 'TOP_DOWN') {
      targetCamLookAt.current = new THREE.Vector3(0, 0, 0)
      targetCamPos.current = new THREE.Vector3(0, 75, 0.1)
    } else if (type === 'WALKWAY') {
      targetCamLookAt.current = new THREE.Vector3(0, 3, -15)
      targetCamPos.current = new THREE.Vector3(0, 2.5, 36)
    } else if (type === 'RESET') {
      targetCamLookAt.current = new THREE.Vector3(0, 0, 0)
      targetCamPos.current = new THREE.Vector3(0, 48, 65)
    }
    controls.update()
  }

  return (
    <div className="space-y-4 h-[calc(100vh-5.5rem)] flex flex-col relative select-none">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER & REAL-TIME DIGITAL TWIN FLEET KPI BAR     */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Global Factory Digital Twin
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest font-mono">
                  3D Spatial Engine
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time photorealistic industrial floor twin with spatial machine telemetry and health telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Fleet KPI Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="glass-panel px-3 py-1.5 flex items-center gap-2 border border-white/10 text-xs">
            <span className="text-slate-400 font-mono">TOTAL:</span>
            <span className="text-white font-bold">{stats.total} Assets</span>
          </div>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              statusFilter === 'HEALTHY' 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500' 
                : 'glass-panel border-white/10 text-slate-300 hover:border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{stats.healthy} Nominal</span>
          </button>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'WARNING' ? 'ALL' : 'WARNING')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              statusFilter === 'WARNING' 
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500' 
                : 'glass-panel border-white/10 text-slate-300 hover:border-amber-500/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{stats.warning} Warning</span>
          </button>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              statusFilter === 'CRITICAL' 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500' 
                : 'glass-panel border-white/10 text-slate-300 hover:border-rose-500/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>{stats.critical} Critical</span>
          </button>

          <div className="glass-panel px-3 py-1.5 flex items-center gap-1.5 border border-white/10 text-xs">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Fleet Index:</span>
            <span className="font-bold text-white">{stats.avgHealth}%</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN 3D WEBGL VIEWPORT CONTAINER                       */}
      {/* ========================================================= */}
      <div className="flex-1 glass-panel relative overflow-hidden border border-white/10 rounded-2xl flex shadow-2xl">
        
        {/* 3D WebGL Canvas Host */}
        <div ref={mountRef} className="w-full h-full relative cursor-grab active:cursor-grabbing outline-none" />

        {/* ======================================================= */}
        {/* FLOATING 3D AUGMENTED REALITY MACHINE NAME BANNERS     */}
        {/* ======================================================= */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {machines.map((machine) => {
            const health = machine.health_score ?? 100
            const isHealthy = health >= 80
            const isWarning = health >= 60 && health < 80
            const isSelected = selectedMachine?.id === machine.id

            const borderColor = isHealthy 
              ? 'border-emerald-500/70 shadow-emerald-500/20' 
              : isWarning 
              ? 'border-amber-500/70 shadow-amber-500/20' 
              : 'border-rose-500/70 shadow-rose-500/20'
            const badgeBg = isHealthy 
              ? 'bg-emerald-500/20 text-emerald-300' 
              : isWarning 
              ? 'bg-amber-500/20 text-amber-300' 
              : 'bg-rose-500/20 text-rose-300'
            const dotColor = isHealthy ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-rose-400'

            return (
              <div
                key={machine.id}
                ref={(el) => {
                  if (el) bannerElementsRef.current.set(machine.id, el)
                  else bannerElementsRef.current.delete(machine.id)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  focusAndSelectMachine(machine)
                }}
                className={`absolute top-0 left-0 pointer-events-auto cursor-pointer select-none group transition-all duration-150 ${
                  isSelected ? 'z-50 ring-2 ring-cyan-400 rounded-xl' : 'hover:scale-105'
                }`}
                style={{ willChange: 'transform', display: 'none' }}
              >
                {/* Connecting Pin and Holographic Banner Card */}
                <div className="flex flex-col items-center">
                  <div className={`glass-panel bg-slate-950/95 backdrop-blur-xl px-3 py-1.5 rounded-xl border ${borderColor} shadow-2xl flex items-center gap-2.5 transition-all group-hover:border-cyan-400 group-hover:shadow-cyan-500/40`}>
                    
                    {/* Machine ID Tag */}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      M-{machine.id}
                    </span>

                    {/* Machine Name & Equipment Sub-Type */}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white whitespace-nowrap tracking-tight group-hover:text-cyan-200">
                        {machine.name}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                        {machine.type}
                      </span>
                    </div>

                    {/* Health Status Pill */}
                    <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
                      <span>{health.toFixed(0)}%</span>
                    </div>

                    {/* Direct Equipment Details Navigation Link */}
                    <Link
                      to={`/machines/M-${machine.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title={`Open M-${machine.id} Equipment Details`}
                      className="p-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 transition-colors ml-0.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Downward Pointer Caret Line */}
                  <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${
                    isHealthy ? 'border-t-emerald-500/80' : isWarning ? 'border-t-amber-500/80' : 'border-t-rose-500/80'
                  }`} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-cyan-300 tracking-wider font-mono">
              INITIALIZING 3D SPATIAL DIGITAL TWIN...
            </span>
          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* FLOATING 3D CAMERA & LAYER TOOLBAR CONTROLS             */}
        {/* ------------------------------------------------------- */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {/* Camera Presets */}
          <div className="glass-panel bg-slate-950/70 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setCameraView('ISOMETRIC')}
              title="Isometric Perspective"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>3D Orbit</span>
            </button>
            <button
              onClick={() => setCameraView('TOP_DOWN')}
              title="Top-Down Factory Layout"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <Maximize2 className="w-4 h-4 text-purple-400" />
              <span>Plan</span>
            </button>
            <button
              onClick={() => setCameraView('WALKWAY')}
              title="Floor Walkway Perspective"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Walkway</span>
            </button>
            <button
              onClick={() => setCameraView('RESET')}
              title="Reset Default View"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="glass-panel bg-slate-950/70 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3 text-xs shadow-lg">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showZones} 
                onChange={(e) => setShowZones(e.target.checked)} 
                className="rounded accent-cyan-500 text-xs" 
              />
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bays</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showBeacons} 
                onChange={(e) => setShowBeacons(e.target.checked)} 
                className="rounded accent-emerald-500 text-xs" 
              />
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Beacons</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showParticles} 
                onChange={(e) => setShowParticles(e.target.checked)} 
                className="rounded accent-purple-500 text-xs" 
              />
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Telemetry</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showBanners} 
                onChange={(e) => setShowBanners(e.target.checked)} 
                className="rounded accent-cyan-500 text-xs" 
              />
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Banners</span>
            </label>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* INTERACTIVE 3D HOVER TOOLTIP                            */}
        {/* ------------------------------------------------------- */}
        {hoveredMachine && hoverPos && !selectedMachine && (
          <div 
            className="absolute z-30 transition-all duration-75 pointer-events-auto cursor-pointer"
            style={{ left: Math.min(hoverPos.x + 16, (mountRef.current?.clientWidth || 800) - 240), top: Math.max(hoverPos.y - 60, 20) }}
            onClick={(e) => {
              e.stopPropagation()
              focusAndSelectMachine(hoveredMachine)
            }}
          >
            <div className="glass-panel bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 hover:border-cyan-400 px-4 py-3 rounded-xl shadow-2xl flex flex-col gap-1.5 min-w-[210px] transition-all hover:scale-105 active:scale-95 group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">{hoveredMachine.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  (hoveredMachine.health_score ?? 100) >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                  (hoveredMachine.health_score ?? 100) >= 60 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {(hoveredMachine.health_score ?? 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{hoveredMachine.type}</span>
                <span className="text-[10px] text-cyan-400 font-mono">M-{hoveredMachine.id}</span>
              </div>
              
              {/* Click to inspect action row */}
              <div 
                className="mt-1 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-cyan-300 group-hover:text-cyan-200"
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Click to inspect 3D Twin
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* FACTORY ZONES HUD LEGEND (BOTTOM-LEFT)                  */}
        {/* ------------------------------------------------------- */}
        <div className="absolute bottom-4 left-4 z-20 glass-panel bg-slate-950/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-4 text-xs font-medium shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300">Nominal (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300">Warning (60-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300">Critical (&lt;60%)</span>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* SLIDE-OUT 3D DIGITAL TWIN DIAGNOSTIC HUD (RIGHT)        */}
        {/* ------------------------------------------------------- */}
        <AnimatePresence>
          {selectedMachine && (
            <motion.div
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-96 border-l border-white/10 bg-slate-950/85 backdrop-blur-2xl p-6 flex flex-col z-20 shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                      M-{selectedMachine.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">DIGITAL TWIN</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 leading-snug">{selectedMachine.name}</h3>
                  <p className="text-xs text-cyan-400">{selectedMachine.type}</p>
                </div>
                <button 
                  onClick={() => setSelectedMachine(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status & Health Gauge */}
              <div className="py-5 space-y-4 flex-1">
                {/* Health Metric Banner */}
                <div className="glass-panel p-4 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Health Index</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      (selectedMachine.health_score ?? 100) >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                      (selectedMachine.health_score ?? 100) >= 60 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {selectedMachine.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {(selectedMachine.health_score ?? 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">composite score</span>
                  </div>
                  {/* Gauge Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${(selectedMachine.health_score ?? 100) >= 80 ? 'bg-emerald-500' : (selectedMachine.health_score ?? 100) >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${selectedMachine.health_score ?? 100}%` }}
                    />
                  </div>
                </div>

                {/* Spatial Manufacturing Bay Info */}
                <div className="glass-panel p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-slate-200">Factory Floor Allocation</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Deployed in manufacturing sector:
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-cyan-300 flex items-center justify-between">
                    <span>SECTOR-BAY</span>
                    <span className="text-white font-bold">{selectedMachine.type.toUpperCase().slice(0, 10)}</span>
                  </div>
                </div>

                {/* Live Diagnostic Quick Telemetry Readout */}
                <div className="glass-panel p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Spatial Sensor Stream
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                        <Thermometer className="w-3 h-3 text-rose-400" />
                        <span>Thermal</span>
                      </div>
                      <span className="font-mono text-white font-bold">
                        {(45 + (100 - (selectedMachine.health_score ?? 100)) * 0.45).toFixed(1)} °C
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>Vibration</span>
                      </div>
                      <span className="font-mono text-white font-bold">
                        {(1.2 + (100 - (selectedMachine.health_score ?? 100)) * 0.05).toFixed(2)} mm/s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button: Navigate to Full Diagnostics */}
              <div className="pt-4 border-t border-white/10">
                <Link 
                  to={`/machines/M-${selectedMachine.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all hover:shadow-cyan-500/50"
                >
                  <Activity className="w-4 h-4" />
                  <span>Open Full Machine Telemetry</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
export default FactoryMap
