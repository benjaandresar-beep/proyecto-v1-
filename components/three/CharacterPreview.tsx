"use client";

// Vista previa 3D del personaje (inicio y editor de avatar), con rotación
// lenta, sombra proyectada sobre un disco pastel y luz del nuevo estilo.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import { AvatarConfig } from "@/lib/storage";

function Giratorio({ config }: { config: AvatarConfig }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={ref} position={[0, -1, 0]}>
      <CharacterMesh
        piel={config.piel}
        pelo={config.pelo}
        colorPelo={config.colorPelo}
        polera={config.polera}
      />
      {/* disco de suelo que recibe la sombra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[1.15, 32]} />
        <meshStandardMaterial color="#bae6fd" />
      </mesh>
    </group>
  );
}

export default function CharacterPreview({
  config,
  height = 240,
}: {
  config: AvatarConfig;
  height?: number;
}) {
  return (
    <div style={{ height, width: "100%" }}>
      <Canvas shadows camera={{ position: [0, 0.4, 3.4], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[4, 6, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[512, 512]}
        />
        <Giratorio config={config} />
      </Canvas>
    </div>
  );
}
