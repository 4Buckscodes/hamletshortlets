import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import { useCurrentFrame } from "remotion";

export const P = { ink: "#0e1f3b", deep: "#060d1a", navy: "#0b1730", paper: "#f4f3ef", sand: "#e9e4d8", gold: "#d4a849", goldDeep: "#a9802e", warm: "#ffd89a" };

/** Renderer setup: filmic tone mapping, soft shadows, sRGB. */
const Renderer: React.FC<{ exposure: number }> = ({ exposure }) => {
  const { gl } = useThree();
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = exposure;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  return null;
};

/** Studio lighting built from light panels (no downloads), so metals reflect something real. */
export const StudioEnv: React.FC<{ warm?: boolean; frames?: number }> = ({ warm = true }) => (
  <Environment resolution={256} frames={1}>
    <color attach="background" args={["#05080f"]} />
    <Lightformer form="rect" intensity={4} color={warm ? "#fff1d6" : "#ffffff"} position={[0, 6, 4]} scale={[10, 3, 1]} />
    <Lightformer form="rect" intensity={2.5} color="#ffd59a" position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
    <Lightformer form="rect" intensity={1.8} color="#9fb6ff" position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
    <Lightformer form="ring" intensity={3} color="#ffffff" position={[2, 4, 6]} scale={2} />
    <Lightformer form="rect" intensity={3.2} color="#ffe2b0" position={[0, 0, 10]} scale={[14, 8, 1]} />
    <Lightformer form="rect" intensity={1.6} color="#ffd59a" position={[0, -4, 6]} rotation-x={-Math.PI / 3} scale={[12, 4, 1]} />
    <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 2, -10]} rotation-y={Math.PI} scale={[12, 6, 1]} />
  </Environment>
);

/** Full-frame 3D stage with studio env, key light with shadows, fog, bloom and vignette. */
export const Stage: React.FC<{ bg?: string; fog?: [number, number]; exposure?: number; bloom?: number; shadows?: boolean; children: React.ReactNode; warm?: boolean; post?: boolean }> = ({ bg = P.deep, fog = [18, 48], exposure = 1.15, bloom = 0.9, shadows = true, children, warm = true, post = false }) => {
  useCurrentFrame();
  return (
    <ThreeCanvas width={1080} height={1920} style={{ position: "absolute", inset: 0 }} gl={{ antialias: true, preserveDrawingBuffer: true }} shadows={shadows} dpr={1}>
      <Renderer exposure={exposure} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, fog[0], fog[1]]} />
      <StudioEnv warm={warm} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 12, 6]} intensity={2.4} color={warm ? "#fff0d8" : "#ffffff"} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={60} />
      {children}
      {post && <EffectComposer multisampling={4}>
        <Bloom intensity={bloom} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.25} darkness={0.55} />
        <SMAA />
      </EffectComposer>}
    </ThreeCanvas>
  );
};

export { ContactShadows };

/** Physically based gold. */
export const Gold: React.FC<{ rough?: number; glow?: number }> = ({ rough = 0.22, glow = 0 }) => (
  <meshStandardMaterial color={P.gold} metalness={0.92} roughness={rough + 0.06} envMapIntensity={1.8} emissive={P.goldDeep} emissiveIntensity={0.08 + glow} />
);
export const Ink: React.FC<{ rough?: number; metal?: number }> = ({ rough = 0.35, metal = 0.6 }) => (
  <meshStandardMaterial color={P.ink} metalness={metal} roughness={rough} envMapIntensity={1} />
);
