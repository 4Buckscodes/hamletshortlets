import React, { useMemo } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { Gold, Ink, P } from "./studio";

type G = ThreeElements["group"];

/** Plain shapes from SVG path data (one shape per subpath, no hole detection). */
const plainShapes = (d: string) =>
  new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths
    .flatMap((p) => p.subPaths.map((sp) => new THREE.Shape(sp.getPoints(28))));

const MARK = [
  "M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z",
  "M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z",
  "M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z",
];

const useExtrude = (paths: string[], depth: number, scale: number, cx: number, cy: number, bevel = 0) =>
  useMemo(() => paths.map((d) => {
    const g = new THREE.ExtrudeGeometry(plainShapes(d), { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 16 });
    g.translate(-cx, -cy, 0); g.scale(scale, scale, scale); g.rotateX(Math.PI); g.translate(0, 0, (depth + bevel) * scale); g.computeVertexNormals();
    return g;
  }), [depth, scale, cx, cy, bevel]);

/** HAMLET mark, ~1 unit tall. */
export const Mark: React.FC<G & { stem?: "ink" | "gold" | "paper"; depth?: number }> = ({ stem = "ink", depth = 3, ...rest }) => {
  const geos = useExtrude(MARK, depth, 1 / 50, 32, 32, 0.6);
  return (
    <group {...rest}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} castShadow scale={[1, 1, i === 2 ? 0.75 : 1]}>
          {i === 2 ? <Gold rough={0.18} /> : stem === "gold" ? <Gold /> : stem === "paper" ? <meshStandardMaterial color={P.paper} roughness={0.4} /> : <meshStandardMaterial color="#0a1630" roughness={0.5} metalness={0.15} envMapIntensity={0.35} />}
        </mesh>
      ))}
    </group>
  );
};

/** Reflective gold coin with the mark on both faces. Radius r, facing +z. */
export const Coin: React.FC<G & { r?: number }> = ({ r = 1, ...rest }) => (
  <group {...rest}>
    <group scale={r}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1, 1, 0.14, 96]} /><Gold rough={0.2} /></mesh>
      {[0.075, -0.075].map((z) => <mesh key={z} position={[0, 0, z]}><torusGeometry args={[0.93, 0.03, 16, 96]} /><Gold rough={0.12} /></mesh>)}
      <Mark position={[0, 0, 0.07]} scale={1.05} depth={2} />
      <Mark position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]} scale={1.05} depth={2} />
    </group>
  </group>
);

/** Flat stacking coin (axis y). */
export const Disc: React.FC<G & { ink?: boolean }> = ({ ink, ...rest }) => (
  <group {...rest}>
    <mesh castShadow receiveShadow><cylinderGeometry args={[0.42, 0.42, 0.09, 48]} />{ink ? <meshStandardMaterial color="#efe9dc" roughness={0.28} metalness={0.25} envMapIntensity={1.2} /> : <Gold rough={0.25} />}</mesh>
  </group>
);

/** Modern tower: rounded dark body with glowing window bands. */
export const Tower: React.FC<{ x: number; z: number; h: number; w?: number; lit?: number; gold?: number }> = ({ x, z, h, w = 0.9, lit = 0.35, gold = 0 }) => {
  const floors = Math.max(2, Math.floor(h / 0.36));
  const winColor = new THREE.Color("#ffcf7a");
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, h, w]} radius={0.06} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        {gold > 0.5 ? <Gold rough={0.3} /> : <Ink rough={0.32} metal={0.55} />}
      </RoundedBox>
      {[...Array(floors)].map((_, i) => {
        const on = gold > 0 ? Math.min(1, Math.max(0, gold * floors - i)) : ((i * 13 + Math.round(x * 7 + z * 11)) % 5 < 2 ? lit : 0);
        if (gold === 0 && on === 0) return null;
        return (
          <mesh key={i} position={[0, 0.25 + i * 0.36, 0]}>
            <boxGeometry args={[w + 0.01, 0.035, w + 0.01]} />
            <meshStandardMaterial color={winColor} emissive={winColor} emissiveIntensity={0.3 + on * 1.4} toneMapped={false} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, h + 0.02, 0]}><boxGeometry args={[w * 0.92, 0.04, w * 0.92]} /><Gold rough={0.25} /></mesh>
    </group>
  );
};

export const House: React.FC<{ x: number; z: number; s?: number; lit?: number }> = ({ x, z, s = 1, lit = 0.6 }) => (
  <group position={[x, 0, z]} scale={[1, s, 1]}>
    <RoundedBox args={[1.0, 0.8, 1.0]} radius={0.05} position={[0, 0.4, 0]} castShadow receiveShadow><meshStandardMaterial color={P.paper} roughness={0.5} /></RoundedBox>
    <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.82, 0.56, 4]} /><Gold rough={0.3} /></mesh>
    <mesh position={[0, 0.35, 0.505]}><planeGeometry args={[0.24, 0.4]} /><meshStandardMaterial color="#ffcf7a" emissive="#ffcf7a" emissiveIntensity={0.5 + lit * 1.5} toneMapped={false} /></mesh>
  </group>
);

/** Round diorama platform with a gold edge. */
export const Plinth: React.FC<{ r?: number; h?: number }> = ({ r = 7, h = 0.5 }) => (
  <group>
    <mesh position={[0, -h / 2, 0]} receiveShadow castShadow><cylinderGeometry args={[r, r * 1.02, h, 128]} /><meshStandardMaterial color="#0d1a33" roughness={0.45} metalness={0.3} /></mesh>
    <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[r - 0.05, 0.035, 12, 160]} /><meshStandardMaterial color={P.gold} emissive={P.gold} emissiveIntensity={1.2} toneMapped={false} /></mesh>
  </group>
);

export const Floor: React.FC<{ color?: string }> = ({ color = "#08111f" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color={color} roughness={0.92} metalness={0} envMapIntensity={0.15} /></mesh>
);

export const Pin: React.FC<G> = (props) => (
  <group {...props}>
    <mesh position={[0, 0.95, 0]} castShadow><sphereGeometry args={[0.36, 48, 48]} /><Gold rough={0.15} /></mesh>
    <mesh position={[0, 0.38, 0]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[0.28, 0.8, 48]} /><Gold rough={0.15} /></mesh>
    <mesh position={[0, 0.95, 0.31]}><sphereGeometry args={[0.12, 24, 24]} /><meshStandardMaterial color={P.ink} roughness={0.3} /></mesh>
    <pointLight position={[0, 0.9, 0.6]} intensity={3} distance={3} color="#ffd48a" />
  </group>
);

export const Shield: React.FC<G> = (props) => {
  const [body, rim, check] = [
    useExtrude(["M65 8 L118 28 V72 C118 108 94 132 65 144 C36 132 12 108 12 72 V28Z"], 16, 1 / 70, 65, 76, 3)[0],
    useExtrude(["M65 0 L126 23 V72 C126 113 99 140 65 153 C31 140 4 113 4 72 V23Z"], 8, 1 / 70, 65, 76, 2)[0],
    useExtrude(["M36 76 L50 62 L60 72 L88 44 L102 58 L60 100Z"], 24, 1 / 70, 65, 76, 2)[0],
  ];
  return (
    <group {...props}>
      <mesh geometry={rim} position={[0, 0, -0.06]} castShadow><Gold rough={0.15} /></mesh>
      <mesh geometry={body} castShadow><Ink rough={0.25} metal={0.6} /></mesh>
      <mesh geometry={check} position={[0, 0, 0.04]}><Gold rough={0.12} glow={0.15} /></mesh>
    </group>
  );
};

/** Light-trail arc, drawn up to p. */
export const Trail: React.FC<{ a: [number, number, number]; b: [number, number, number]; lift?: number; p?: number }> = ({ a, b, lift = 2.5, p = 1 }) => {
  const geo = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().add(B).multiplyScalar(0.5); M.y += lift;
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 64, 0.035, 8, false);
  }, [a[0], a[1], a[2], b[0], b[1], b[2], lift]);
  const total = geo.index ? geo.index.count : 0;
  geo.setDrawRange(0, Math.floor((Math.max(0, Math.min(1, p)) * total) / 6) * 6);
  return <mesh geometry={geo}><meshStandardMaterial color="#ffd48a" emissive="#ffc766" emissiveIntensity={2.2} toneMapped={false} /></mesh>;
};

export const onArc = (a: [number, number, number], b: [number, number, number], lift: number, t: number): [number, number, number] => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().add(B).multiplyScalar(0.5); M.y += lift;
  const v = new THREE.QuadraticBezierCurve3(A, M, B).getPoint(Math.max(0, Math.min(1, t)));
  return [v.x, v.y, v.z];
};

export const cityPlan = (seed: number, r = 5.6) => {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: { x: number; z: number; h: number }[] = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    const x = i * 1.25, z = j * 1.25;
    if (Math.hypot(x, z) > r) continue;
    const c = 1 - Math.hypot(x, z) / (r + 1);
    out.push({ x, z, h: 0.7 + rnd() * 2.2 + c * 2.6 });
  }
  return out;
};
