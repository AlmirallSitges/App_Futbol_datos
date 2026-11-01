// Descarga calendario, resultados y clasificación de fcf.cat (Cadet Preferent S15, Grup 4)
// y regenera datos.json con el formato que lee la app.
import fs from "node:fs";

const GRUP = "58270222";
const BASE = "https://www.fcf.cat/api/competition";
const CASA = "ESTADI MPAL. ASSOCIACIÓ ALUMNES OBRERS, Vilanova i la Geltrú";
const VILANOVA = "FUNDACIO F. VILANOVA I LA GELTRÚ A";

// nombre en fcf.cat -> [nombre en partidos, nombre en clasificación]
const EQUIPOS = {
  "AMPOSTA, C.F. A": ["Amposta", "Amposta"],
  "CANONJA, C.F. A": ["Canonja", "Canonja"],
  "FUNDACIO ATLETIC SANT JUST A": ["F. Atlètic Sant Just", "Sant Just"],
  "FUNDACIO F. VILANOVA I LA GELTRÚ A": ["FF Vilanova", "FF Vilanova"],
  "CASTELLDEFELS, U.E. A": ["Castelldefels", "Castelldefels"],
  "GIMNASTIC TARRAGONA, C. B": ["Gimnàstic Tarragona B", "Gimnàstic B"],
  "FUNDACIO E. ATLETIC VILAFRANCA A": ["Atlètic Vilafranca", "Vilafranca"],
  "RIBES, C.D. A": ["Ribes", "Ribes"],
  "ESCOLA FUTBOL BASE CALAFELL CF A": ["EFB Calafell", "EFB Calafell"],
  "FUNDACIO UCF CAMBRILS A": ["UCF Cambrils", "UCF Cambrils"],
  "PRAT, A.E. A": ["Prat A.E.", "Prat A.E."],
  "ESPLUGUENC, C.F.A. A": ["Espluguenc", "Espluguenc"],
  "VINYETS MOLI-VELL, C.F. A": ["Vinyets Molí-Vell", "Vinyets"],
  "BASE MARC BARTRA CF A": ["Base Marc Bartra", "Marc Bartra"],
  "LA FLORESTA, C.D. A": ["La Floresta", "La Floresta"],
  "AEM, S.E. A": ["AEM", "AEM"],
};
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const nombre = (api, i) => (EQUIPOS[norm(api)] || [norm(api), norm(api)])[i];

async function get(path) {
  const r = await fetch(`${BASE}/${path}?grupId=${GRUP}`, {
    headers: { "User-Agent": "App_Futbol_datos/1.0 (uso personal)", Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

const [cl, pa] = await Promise.all([get("classificacio"), get("partidos")]);

// Clasificación
const clasificacion = cl.data.map((t) => ({
  equipo: nombre(t.team.name, 1),
  pj: +t.played, g: +t.won, e: +t.drawn, p: +t.lost,
  gf: +t.goalsFor, gc: +t.goalsAgainst, pts: Math.round(+t.points),
}));

// Partidos del Vilanova
const previo = fs.existsSync("datos.json") ? JSON.parse(fs.readFileSync("datos.json", "utf8")) : null;
const notasPrevias = Object.fromEntries((previo?.partidos || []).map((x) => [x.j, x.nota || ""]));
const partidos = [];
for (const [j, lista] of Object.entries(pa.partidos)) {
  const m = lista.find((x) => norm(x.NOMBRE_CASA) === VILANOVA || norm(x.NOMBRE_FUERA) === VILANOVA);
  if (!m) continue;
  if (!m.COMIENZO1) { console.warn(`Jornada ${j}: sin fecha, se omite`); continue; }
  const casa = norm(m.NOMBRE_CASA) === VILANOVA;
  const jugado = m.GOLES_CASA !== null && m.GOLES_CASA !== "" && m.GOLES_FUERA !== null && m.GOLES_FUERA !== "";
  partidos.push({
    j: +j,
    local: nombre(m.NOMBRE_CASA, 0),
    visitante: nombre(m.NOMBRE_FUERA, 0),
    casa,
    inicio: m.COMIENZO1.slice(0, 16),
    campo: casa ? CASA : norm(m.CAMPO),
    nota: jugado ? notasPrevias[+j] || "" : "", // las notas de partidos sin jugar caducan
    resultado: jugado ? [+m.GOLES_CASA, +m.GOLES_FUERA] : null,
  });
}
partidos.sort((a, b) => a.j - b.j);

// Comprobaciones: si algo no cuadra, no se toca datos.json
if (clasificacion.length !== 16) throw new Error(`Clasificación con ${clasificacion.length} equipos`);
if (partidos.length < 28) throw new Error(`Solo ${partidos.length} partidos del Vilanova`);
if (clasificacion.some((c) => Object.values(c).some((v) => v === null || Number.isNaN(v))))
  throw new Error("Clasificación con valores no numéricos");

const hasta = +pa.jornada.codjornada;
const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
const J = (x) => JSON.stringify(x);
const cuerpo = (act) =>
  `{\n "actualizado": ${J(act)},\n "hasta_jornada": ${hasta},\n "partidos": [\n${partidos.map((p) => "  " + J(p)).join(",\n")}\n ],\n "clasificacion": [\n${clasificacion.map((c) => "  " + J(c)).join(",\n")}\n ]\n}\n`;

// Solo se reescribe (y cambia la fecha) si los datos son distintos
if (previo && fs.readFileSync("datos.json", "utf8") === cuerpo(previo.actualizado)) {
  console.log("Sin cambios.");
  process.exit(0);
}
fs.writeFileSync("datos.json", cuerpo(hoy));
console.log(`datos.json actualizado: ${partidos.length} partidos, jornada ${hasta}`);
