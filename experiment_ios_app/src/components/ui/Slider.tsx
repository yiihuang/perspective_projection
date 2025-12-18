

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
    return (
        <div className="flex flex-col space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <span>{label}</span>
                <span className="font-mono text-indigo-300 bg-indigo-500/10 px-1.5 rounded">{value.toFixed(step < 1 ? 1 : 0)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
            />
        </div>
    );
}
