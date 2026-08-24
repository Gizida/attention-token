type BackgroundBeamsProps = {
  className?: string;
};

const beamPaths = [
  "M-160 18C44 10 116 102 292 134C464 166 578 122 850 292",
  "M-180 46C26 26 130 136 304 162C478 188 598 146 870 316",
  "M-200 76C8 46 142 166 320 194C496 222 616 174 892 344",
  "M-220 108C-8 70 156 198 336 226C514 254 636 204 914 372",
  "M-240 142C-24 96 170 230 352 258C532 286 656 234 936 400",
  "M-260 178C-42 124 184 264 370 290C554 316 678 264 960 428",
];

/** A dependency-free adaptation of Aceternity's animated SVG background beams. */
export function BackgroundBeams({ className = "" }: BackgroundBeamsProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        className="h-full w-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {beamPaths.map((_, index) => (
            <linearGradient id={`attention-beam-${index}`} key={index} x1="0%" x2="0%" y1="0%" y2="0%">
              <stop stopColor="#7cf5aa" stopOpacity="0" />
              <stop offset="0.42" stopColor="#7cf5aa" stopOpacity="0.88" />
              <stop offset="0.72" stopColor="#a8ffd0" stopOpacity="0.38" />
              <stop offset="1" stopColor="#7cf5aa" stopOpacity="0" />
              <animate attributeName="x1" values="0%;100%;100%" dur={`${8 + index}s`} begin={`${3 + index * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="x2" values="0%;92%;100%" dur={`${8 + index}s`} begin={`${3 + index * 0.8}s`} repeatCount="indefinite" />
            </linearGradient>
          ))}
        </defs>

        {beamPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            stroke={`url(#attention-beam-${index})`}
            strokeWidth="1.15"
            strokeOpacity="0.85"
          />
        ))}
      </svg>
    </div>
  );
}
