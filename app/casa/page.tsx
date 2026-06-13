"use client";

// Contexto Casa explorable (4.2, ampliado). Antes de entrar, siempre el
// asentimiento (5.1).

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import CasaGame3D from "@/components/CasaGame3D";

export default function Casa() {
  const [asentido, setAsentido] = useState(false);
  if (!asentido) {
    return (
      <Asentimiento
        nombre="Casa"
        emoji="🏠"
        quienes="tu familia"
        onConfirmar={() => setAsentido(true)}
      />
    );
  }
  return <CasaGame3D />;
}
