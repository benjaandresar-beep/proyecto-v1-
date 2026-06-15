"use client";

// Contexto Terapia explorable (centro de terapia). Antes de entrar, siempre el
// asentimiento (5.1).

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import TerapiaGame3D from "@/components/TerapiaGame3D";

export default function Terapia() {
  const [asentido, setAsentido] = useState(false);
  if (!asentido) {
    return (
      <Asentimiento
        nombre="Terapia"
        emoji="🧩"
        quienes="otros niños y tus terapeutas"
        onConfirmar={() => setAsentido(true)}
      />
    );
  }
  return <TerapiaGame3D />;
}
