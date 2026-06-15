"use client";

// Contexto Escuela explorable (4.1, ampliado): sala de clases + patio.
// Antes de entrar, siempre el asentimiento (5.1).

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import EscuelaGame3D from "@/components/EscuelaGame3D";

export default function Escuela() {
  const [asentido, setAsentido] = useState(false);
  if (!asentido) {
    return (
      <Asentimiento
        nombre="Escuela"
        emoji="🏫"
        quienes="tus compañeros"
        onConfirmar={() => setAsentido(true)}
      />
    );
  }
  return <EscuelaGame3D />;
}
