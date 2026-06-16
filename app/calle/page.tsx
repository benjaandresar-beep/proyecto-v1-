"use client";

// Contexto Calle explorable (4.3, ampliado): la calle + plaza/parque.
// Antes de entrar, siempre el asentimiento (5.1).

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import CalleGame3D from "@/components/CalleGame3D";

export default function Calle() {
  const [asentido, setAsentido] = useState(false);
  if (!asentido) {
    return (
      <Asentimiento
        nombre="Calle"
        emoji="🚦"
        quienes="las personas de la calle y la plaza"
        onConfirmar={() => setAsentido(true)}
      />
    );
  }
  return <CalleGame3D />;
}
