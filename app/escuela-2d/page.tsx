"use client";

// Versión 2D original del contexto Escuela, conservada para comparar ambas
// representaciones durante la validación con familias y clínicos.

import { useState } from "react";
import SchoolGame from "@/components/SchoolGame";
import AsentimientoEscuela from "@/components/AsentimientoEscuela";

export default function Escuela2D() {
  const [asentido, setAsentido] = useState(false);
  if (!asentido) return <AsentimientoEscuela onConfirmar={() => setAsentido(true)} />;
  return <SchoolGame />;
}
