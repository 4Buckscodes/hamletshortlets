import { AbsoluteFill } from "remotion";
import { Stage, ContactShadows, Gold, P } from "./studio";
import { Cam, Mark3D } from "../three/kit3d";
import { useSec } from "../kit/kit";

export const Lab = () => {
  const t = useSec();
  return (
    <AbsoluteFill>
      <Stage post={false}>
        <Cam pos={[0, 1.2, 7]} look={[0, 0.6, 0]} fov={35} />
        <group position={[0, 1.2, 0]} rotation={[0.1, t * 1.5, 0]} scale={1.3}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1, 1, 0.16, 96]} /><Gold /></mesh>
          <Mark3D position={[0, 0, 0.081]} scale={1.1} color={P.ink} bar={P.gold} depth={0.04} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color={P.navy} roughness={0.4} metalness={0.3} /></mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={8} blur={2.4} far={4} frames={1} />
      </Stage>
    </AbsoluteFill>
  );
};
