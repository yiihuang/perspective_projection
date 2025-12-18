import { Canvas } from '@react-three/fiber'
import { useAppStore } from './store'
import { Scene } from './components/canvas/Scene'
import { TwoDView } from './components/canvas/TwoDView'
import { Controls } from './components/Controls'

function App() {
  const { activeWindow, setActiveWindow } = useAppStore();

  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden flex flex-col md:flex-row">
      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-1 p-1">

        {/* View 1: Linear 3D */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800" onClick={() => setActiveWindow('linear3D')}>
          <div className={`absolute top-2 left-2 z-10 text-xs font-bold px-2 py-1 rounded text-white ${activeWindow === 'linear3D' ? 'bg-blue-600' : 'bg-black/50'}`}>Linear 3D</div>
          <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
            <Scene mode="linear" />
          </Canvas>
        </div>

        {/* View 2: Linear 2D */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
          <div className="absolute top-2 left-2 z-10 text-xs font-bold bg-black/50 px-2 py-1 rounded text-white">Linear 2D</div>
          <Canvas orthographic camera={{ zoom: 100, position: [0, 0, 10] }}>
            <TwoDView mode="linear" />
          </Canvas>
        </div>

        {/* View 3: Hemi 3D */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
          <div className="absolute top-2 left-2 z-10 text-xs font-bold bg-black/50 px-2 py-1 rounded text-white">Hemi 3D</div>
          <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
            <Scene mode="hemispherical" />
          </Canvas>
        </div>

        {/* View 4: Hemi 2D */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
          <div className="absolute top-2 left-2 z-10 text-xs font-bold bg-black/50 px-2 py-1 rounded text-white">Hemi 2D</div>
          <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 10] }}>
            <TwoDView mode="hemispherical" />
          </Canvas>
        </div>

      </div>

      {/* Controls Container (Side or Bottom) */}
      <div className="h-1/3 md:h-full md:w-80 glass-panel border-t md:border-t-0 md:border-l p-6 overflow-y-auto bg-slate-950/80">
        <h1 className="text-xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">Controls</h1>
        <Controls />
      </div>
    </div>
  )
}

export default App
