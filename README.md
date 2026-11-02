# App_Futbol_datos

Datos públicos que lee la app **Partidos FF Vilanova** (Cadet S15, Preferent Grup 4):
calendario, resultados y clasificación. Origen: fcf.cat.

- `datos.json` es el único archivo que usa la app. Al abrirla lo descarga; si no hay internet, usa los últimos datos guardados.
- `partidos[].resultado` es `[goles del local, goles del visitante]`, o `null` si aún no se ha jugado.
- `actualizado` y `hasta_jornada` indican hasta dónde llegan los resultados.
- La raíz del archivo es el equipo 1 (FF Vilanova A, Cadet S15, Preferent G4). El bloque `equipo2` es el equipo 2 (Base Vilanova B, Infantil 2ª Div. S14, Grup 24) y tiene el mismo formato.
