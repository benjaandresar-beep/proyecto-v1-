"use client";

// Contexto Calle (4.3, Fase 2). Antes de entrar, siempre el asentimiento (5.1).

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import ContextGame3D from "@/components/ContextGame3D";
import { CONTEXTOS } from "@/lib/contexts";

export default function Calle() {
  const [asentido, setAsentido] = useState(false);
  const contexto = CONTEXTOS.calle;
  if (!asentido) {
    return (
      <Asentimiento
        nombre={contexto.nombre}
        emoji={contexto.emoji}
        quienes={contexto.asentimientoQuienes}
        onConfirmar={() => setAsentido(true)}
      />
    );
  }
  return <ContextGame3D contexto={contexto} />;
}
