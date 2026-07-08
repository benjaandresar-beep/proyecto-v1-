"use client";

// Activa sombras en todos los meshes de la escena (proyectar y recibir),
// saltando los materiales translúcidos (guatita, superficies invisibles).
// Se coloca una vez dentro del <Canvas shadows> y se re-ejecuta en cada
// commit de React para cubrir meshes que aparecen después (NPC, puertas).

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function AutoSombras() {
  const { scene } = useThree();
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material | undefined;
      if (!mat || mat.transparent) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  });
  return null;
}
