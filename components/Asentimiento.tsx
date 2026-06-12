"use client";

// Bloque de advertencia y asentimiento previo a CADA contexto (salvaguarda 5.1).
// Texto provisional, lo valida el responsable clínico.

import Link from "next/link";

export default function Asentimiento({
  nombre,
  emoji,
  quienes,
  onConfirmar,
}: {
  nombre: string;
  emoji: string;
  quienes: string;
  onConfirmar: () => void;
}) {
  return (
    <main className="pantalla" style={{ justifyContent: "center" }}>
      <div className="tarjeta" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 className="titulo">
          Antes de entrar a la {nombre} {emoji}
        </h1>
        <p className="dialogo-texto">
          En este juego vas a conocer cómo se sienten {quienes}. Recuerda algo muy importante:
        </p>
        <p className="dialogo-texto" style={{ fontWeight: 700 }}>
          Tú NO eres responsable de hacer que todos se sientan bien.
        </p>
        <p className="dialogo-texto">
          A veces las cosas se escapan de nuestro control, y eso le pasa a todo el mundo. Cuando tu
          cuerpo se sienta muy cargado, puedes usar tus herramientas de calma o pedir ayuda extra.
          Pedir ayuda también es ser valiente.
        </p>
        <button className="boton verde" onClick={onConfirmar}>
          ¡Entendido, entremos! ✓
        </button>
        <Link href="/" className="boton secundario">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
