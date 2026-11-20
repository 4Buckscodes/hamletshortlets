import React, { useMemo } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useThree } from "@react-three/fiber";
import { GLYPHS, UPM } from "./glyphs";
import type { ThreeElements } from "@react-three/fiber";
type G = ThreeElements["group"];

export const K = { ink: "#0e1f3b", deep: "#091528", paper: "#f4f3ef", sand: "#eae8e1", gold: "#c9a24a", gold2: "#e2c27a", night: "#16223a", ok: "#2f8a57" };

const MARK_PATHS = [
  "M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z",
  "M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z",
  "M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z",
];

const shapesFrom = (d: string) => new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths.flatMap((p) => p.toShapes());

/** Camera driven by the frame: pass position and target every render. */
export const Cam: React.FC<{ pos: [number, number, number]; look?: [number, number, number]; fov?: number }> = ({ pos, look = [0, 0, 0], fov = 40 }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  camera.lookAt(...look);
  return null;
};

export const Lights: React.FC<{ warm?: boolean }> = ({ warm = true }) => (
  <>
    <ambientLight intensity={0.8} />
    <hemisphereLight args={[warm ? "#fff4dc" : "#dfe8ff", "#0e1f3b", 0.7]} />
    <directionalLight position={[6, 10, 8]} intensity={2.8} color={warm ? "#fff1d6" : "#ffffff"} />
    <directionalLight position={[-8, 4, -4]} intensity={0.6} color="#9fb3d9" />
  </>
);

/** Extruded Newsreader numerals / symbols (glyphs available: 0-9 % ?). Centered on the origin. */
export const Glyphs3D: React.FC<{ text: string; size?: number; depth?: number; color?: string; metal?: number } & G> = ({ text, size = 1, depth = 0.25, color = K.gold, metal = 0.8, ...rest }) => {
  const geo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    let x = 0;
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (!g) continue;
      const shapes = shapesFrom(g.d);
      const eg = new THREE.ExtrudeGeometry(shapes, { depth: depth * UPM / size, bevelEnabled: true, bevelThickness: 18, bevelSize: 12, bevelSegments: 3, curveSegments: 10 });
      eg.translate(x * UPM, 0, 0);
      geos.push(eg);
      x += g.adv;
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeos(geos);
    merged.scale(size / UPM, size / UPM, size / UPM);
    merged.computeBoundingBox();
    const b = merged.boundingBox!;
    merged.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
    merged.computeVertexNormals();
    return merged;
  }, [text, size, depth]);
  return (
    <group {...rest}>
      <mesh geometry={geo}><meshStandardMaterial color={color} metalness={metal * 0.45} roughness={0.32} emissive={color} emissiveIntensity={0.1} /></mesh>
    </group>
  );
};

function mergeGeos(geos: THREE.BufferGeometry[]) {
  // minimal merge for non-indexed / indexed ExtrudeGeometry
  const pos: number[] = [];
  for (const g of geos) {
    const gg = g.index ? g.toNonIndexed() : g;
    pos.push(...(gg.attributes.position.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return out;
}

/** HAMLET mark, extruded. Centered, 1 unit tall. */
export const Mark3D: React.FC<{ color?: string; bar?: string; depth?: number } & G> = ({ color = K.ink, bar = K.gold, depth = 0.12, ...rest }) => {
  const geos = useMemo(() => MARK_PATHS.map((d) => {
    const g = new THREE.ExtrudeGeometry(shapesFrom(d), { depth: depth * 50, bevelEnabled: false, curveSegments: 12 });
    g.translate(-32, -32, 0); g.scale(1 / 50, -1 / 50, 1 / 50);
    g.computeVertexNormals();
    return g;
  }), [depth]);
  return (
    <group {...rest}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}><meshStandardMaterial color={i === 2 ? bar : color} metalness={i === 2 ? 0.35 : 0.2} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  );
};

/** Gold coin with the HAMLET mark on both faces. Radius 1, axis along z. */
export const Coin: React.FC<G & { r?: number }> = ({ r = 1, ...rest }) => (
  <group {...rest} scale={r}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1, 1, 0.16, 64]} /><meshStandardMaterial color={K.gold} metalness={0.35} roughness={0.32} emissive={K.gold} emissiveIntensity={0.12} /></mesh>
    <mesh position={[0, 0, 0.08]}><torusGeometry args={[0.9, 0.035, 12, 64]} /><meshStandardMaterial color={K.gold2} metalness={0.4} roughness={0.3} /></mesh>
    <mesh position={[0, 0, -0.08]}><torusGeometry args={[0.9, 0.035, 12, 64]} /><meshStandardMaterial color={K.gold2} metalness={0.4} roughness={0.3} /></mesh>
    <Mark3D position={[0, 0, 0.08]} scale={1.15} color={K.ink} bar={K.gold2} depth={0.05} />
    <Mark3D position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]} scale={1.15} color={K.ink} bar={K.gold2} depth={0.05} />
  </group>
);

/** Flat coin for stacks (axis along y). */
export const CoinFlat: React.FC<G & { color?: string }> = ({ color = K.gold, ...rest }) => (
  <group {...rest}>
    <mesh><cylinderGeometry args={[0.45, 0.45, 0.1, 40]} /><meshStandardMaterial color={color} metalness={color === K.gold ? 0.35 : 0.2} roughness={0.35} emissive={color === K.gold ? K.gold : '#000000'} emissiveIntensity={color === K.gold ? 0.12 : 0} /></mesh>
  </group>
);

/** A residential tower with window bands. */
export const Tower: React.FC<{ x: number; z: number; h: number; w?: number; d?: number; color?: string; glow?: number }> = ({ x, z, h, w = 0.9, d = 0.9, color = K.ink, glow = 0 }) => {
  const floors = Math.max(1, Math.floor(h / 0.32));
  const lit = new THREE.Color(K.ink).lerp(new THREE.Color(K.gold), glow);
  return (
    <group position={[x, h / 2, z]}>
      <mesh><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={glow > 0 ? lit : color} metalness={0.15} roughness={0.6} emissive={K.gold} emissiveIntensity={glow * 0.25} /></mesh>
      {[...Array(floors)].map((_, i) => (
        <mesh key={i} position={[0, -h / 2 + 0.2 + i * 0.32, d / 2 + 0.005]}>
          <planeGeometry args={[w * 0.78, 0.1]} />
          <meshStandardMaterial color={K.gold2} emissive={K.gold2} emissiveIntensity={0.25 + glow * 0.9} />
        </mesh>
      ))}
    </group>
  );
};

/** Deterministic city block grid. */
export const cityLayout = (seed: number, n = 7, gap = 1.5) => {
  let s = seed;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: { x: number; z: number; h: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push({ x: (i - (n - 1) / 2) * gap, z: (j - (n - 1) / 2) * gap, h: 0.8 + r() * 3.2 });
  return out;
};

export const Ground: React.FC<{ color?: string; size?: number }> = ({ color = K.sand, size = 60 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}><planeGeometry args={[size, size]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
);

export const Pin: React.FC<G> = (props) => (
  <group {...props}>
    <mesh position={[0, 0.9, 0]}><sphereGeometry args={[0.38, 32, 32]} /><meshStandardMaterial color={K.gold} metalness={0.3} roughness={0.3} emissive={K.gold} emissiveIntensity={0.15} /></mesh>
    <mesh position={[0, 0.35, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.3, 0.75, 32]} /><meshStandardMaterial color={K.gold} metalness={0.3} roughness={0.3} emissive={K.gold} emissiveIntensity={0.15} /></mesh>
    <mesh position={[0, 0.9, 0.3]}><sphereGeometry args={[0.13, 16, 16]} /><meshStandardMaterial color={K.ink} /></mesh>
  </group>
);

/** Verification shield with a check, extruded. ~2 units tall. */
export const Shield3D: React.FC<G> = (props) => {
  const [shield, check] = useMemo(() => {
    const s = new THREE.ExtrudeGeometry(shapesFrom("M65 8 L118 28 V72 C118 108 94 132 65 144 C36 132 12 108 12 72 V28Z"), { depth: 18, bevelEnabled: true, bevelSize: 4, bevelThickness: 4, bevelSegments: 3 });
    const c = new THREE.ExtrudeGeometry(shapesFrom("M36 76 L50 62 L60 72 L88 44 L102 58 L60 100Z"), { depth: 26, bevelEnabled: false });
    for (const g of [s, c]) { g.translate(-65, -76, 0); g.scale(1 / 70, -1 / 70, 1 / 70); g.computeVertexNormals(); }
    return [s, c];
  }, []);
  return (
    <group {...props}>
      <mesh geometry={shield}><meshStandardMaterial color={K.ink} metalness={0.3} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={check} position={[0, 0, 0.02]}><meshStandardMaterial color={K.gold} metalness={0.3} roughness={0.3} emissive={K.gold} emissiveIntensity={0.2} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

/** Glowing arc between two points, drawn up to progress p. */
export const Arc: React.FC<{ a: [number, number, number]; b: [number, number, number]; lift?: number; p?: number; color?: string; r?: number }> = ({ a, b, lift = 2, p = 1, color = K.gold, r = 0.04 }) => {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const M = A.clone().add(B).multiplyScalar(0.5); M.y += lift;
    return new THREE.QuadraticBezierCurve3(A, M, B);
  }, [a[0], a[1], a[2], b[0], b[1], b[2], lift]);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 48, r, 8, false), [curve, r]);
  const count = Math.floor(Math.max(0, Math.min(1, p)) * (geo.index ? geo.index.count : 0) / 6) * 6;
  geo.setDrawRange(0, count);
  return <mesh geometry={geo}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.5} roughness={0.3} /></mesh>;
};

export const pointOnArc = (a: [number, number, number], b: [number, number, number], lift: number, t: number): [number, number, number] => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const M = A.clone().add(B).multiplyScalar(0.5); M.y += lift;
  const v = new THREE.QuadraticBezierCurve3(A, M, B).getPoint(Math.max(0, Math.min(1, t)));
  return [v.x, v.y, v.z];
};
