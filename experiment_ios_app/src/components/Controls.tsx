
import { useAppStore } from '../store';
import { Slider } from './ui/Slider';

export function Controls() {
    const {
        viewpoint, setViewpoint,
        radius, setRadius,
        cubeRotation, setCubeRotation
    } = useAppStore();

    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Viewpoint</h3>
                <div className="space-y-4">
                    <Slider
                        label="X Position"
                        value={viewpoint.x} min={-10} max={10} step={0.1}
                        onChange={(v) => setViewpoint({ x: v })}
                    />
                    <Slider
                        label="Y Position"
                        value={viewpoint.y} min={-10} max={10} step={0.1}
                        onChange={(v) => setViewpoint({ y: v })}
                    />
                    <Slider
                        label="Z Position"
                        value={viewpoint.z} min={0} max={20} step={0.1}
                        onChange={(v) => setViewpoint({ z: v })}
                    />
                </div>
            </section>

            <div className="h-px bg-slate-800" />

            <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Projection</h3>
                <div className="space-y-4">
                    <Slider
                        label="Radius (Hemispherical)"
                        value={radius} min={1} max={15} step={0.1}
                        onChange={setRadius}
                    />
                </div>
            </section>

            <div className="h-px bg-slate-800" />

            <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cube Rotation</h3>
                <div className="space-y-4">
                    <Slider
                        label="Rotate X"
                        value={cubeRotation.x} min={-180} max={180}
                        onChange={(v) => setCubeRotation({ x: v })}
                    />
                    <Slider
                        label="Rotate Y"
                        value={cubeRotation.y} min={-180} max={180}
                        onChange={(v) => setCubeRotation({ y: v })}
                    />
                    <Slider
                        label="Rotate Z"
                        value={cubeRotation.z} min={-180} max={180}
                        onChange={(v) => setCubeRotation({ z: v })}
                    />
                </div>
            </section>
        </div>
    );
}
