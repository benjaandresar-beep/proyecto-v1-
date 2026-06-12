"use client";

// Entrada al contexto Escuela. Antes de entrar, SIEMPRE se muestra el bloque de
// advertencia y asentimiento (salvaguarda 5.1): el niño no es responsable de hacer
// sentir bien a todos, y pedir ayuda está bien. El texto definitivo lo redacta el
// responsable clínico.

import Link from "next/link";
import { useState } from "react";
import SchoolGame from "@/components/SchoolGame";

export default function Escuela() {
  const [asentido, setAsentido] = useState(false);

  if (asentido) return <SchoolGame />;

  return (
    <main className="pantalla" style={{ justifyContent: "center" }}>
      <div className="tarjeta" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 className="titulo">Antes de entrar a la Escuela 🏫</h1>
        <p className="dialogo-texto">
          En este juego vas a conocer cómo se sienten tus compañeros. Recuerda algo muy importante:
        </p>
        <p className="dialogo-texto" style={{ fontWeight: 700 }}>
          Tú NO eres responsable de hacer que todos se sientan bien.
        </p>
        <p className="dialogo-texto">
          A veces las cosas se escapan de nuestro control, y eso le pasa a todo el mundo. Cuando tu
          cuerpo se sienta muy cargado, puedes usar tus herramientas de calma o pedir ayuda extra.
          Pedir ayuda también es ser valiente.
        </p>
        <button className="boton verde" onClick={() => setAsentido(true)}>
          ¡Entendido, entremos! ✓
        </button>
        <Link href="/" className="boton secundario">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
