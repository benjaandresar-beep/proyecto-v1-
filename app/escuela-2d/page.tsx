"use client";

// Versión 2D original del contexto Escuela, conservada para comparar ambas
// representaciones durante la validación con familias y clínicos.

import { useState } from "react";
import Asentimiento from "@/components/Asentimiento";
import SchoolGame from "@/components/SchoolGame";

export default function Escuela2D() {
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
  return <SchoolGame />;
}
