// script.js (módulo)
// usa Firebase modular desde CDN

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================
   CONFIGURACIÓN DE FIREBASE
   ============================ */
const firebaseConfig = {
  apiKey: "AIzaSyBqmY8fd_OmMBfyi2r8qSYUxq83mPOAK7o",
  authDomain: "territorioselbello.firebaseapp.com",
  projectId: "territorioselbello",
  storageBucket: "territorioselbello.firebasestorage.app",
  messagingSenderId: "840655572386",
  appId: "1:840655572386:web:a9261d0355fd2d099f76fb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ============================
   Datos en memoria y helpers
   ============================ */
let datos = [];         // array con { id, numero, fechaInicio, fechaFin, encargado, notas }
let lastResults = [];   // últimos resultados de búsqueda (para Telegram si se desea)

async function cargarDatos() {
  // Lee toda la colección 'territorios' y actualiza 'datos'
  try {
    const snap = await getDocs(collection(db, "territorios"));
    datos = snap.docs.map(s => ({ id: s.id, ...s.data() }));
  } catch (err) {
    console.error("Error cargando datos desde Firestore:", err);
    datos = [];
  }
}

/* ============================
   Tabs (igual que antes)
   ============================ */
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ============================
   Guardar nueva entrada -> Firestore
   ============================ */
document.getElementById("territorioForm").addEventListener("submit", async e => {
  e.preventDefault();
  const entrada = {
    numero: Number(document.getElementById("numero").value),
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    encargado: document.getElementById("encargado").value,
    notas: document.getElementById("notas").value
  };

  try {
    await addDoc(collection(db, "territorios"), entrada);
    await cargarDatos();
    e.target.reset();
    alert("Entrada guardada");
  } catch (err) {
    console.error("Error guardando en Firestore:", err);
    alert("Error al guardar. Revisa la consola.");
  }
});

/* ============================
   Buscar (usa Firestore -> memoria -> filtra)
   ============================ */
window.buscarEntradas = async function () {
  await cargarDatos(); // siempre refrescamos
  const num = document.getElementById("filtroNumero").value;
  const numFiltro = num ? Number(num) : null;
  const enc = document.getElementById("filtroEncargado").value.toLowerCase();
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;
  const contenedor = document.getElementById("resultados");
  contenedor.innerHTML = "";

  const filtrado = datos.filter(d => {
    const fecha = d.fechaInicio || "";
    return (!numFiltro || d.numero == numFiltro) &&
           (!enc || (d.encargado || "").toLowerCase().includes(enc)) &&
           (!desde || fecha >= desde) &&
           (!hasta || fecha <= hasta);
  });

  lastResults = filtrado; // guardamos los últimos resultados

  if (filtrado.length === 0) {
    contenedor.innerHTML = "<p>No hay resultados.</p>";
    return;
  }

  filtrado.forEach(d => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>Territorio:</strong> ${d.numero}<br>
      <strong>Inicio:</strong> ${d.fechaInicio || ''}<br>
      <strong>Fin:</strong> ${d.fechaFin || ''}<br>
      <strong>Encargado:</strong> ${d.encargado || ''}<br>
      <strong>Notas:</strong> ${d.notas || ''}<br>
      <button onclick="eliminarEntrada('${d.id}')">🗑️</button>
      <hr>
    `;
    contenedor.appendChild(div);
  });
};

/* ============================
   Eliminar (por id de documento)
   ============================ */
window.eliminarEntrada = async function (id) {
  if (!confirm("¿Eliminar esta entrada?")) return;
  try {
    await deleteDoc(doc(db, "territorios", id));
    await buscarEntradas();
  } catch (err) {
    console.error("Error eliminando:", err);
    alert("No se pudo eliminar.");
  }
};

/* ============================
   Exportar TXT / PDF / CSV
   (funciones expuestas globalmente para onclick en HTML)
   ============================ */
window.exportarTerritorioTXT = async function () {
  await cargarDatos();
  const num = document.getElementById("exportNumero").value;
  const entradas = datos.filter(d => d.numero === Number(num));
  if (!entradas.length) return alert("No hay datos para ese territorio");

  const contenido = entradas.map(d =>
    `Territorio: ${d.numero}\nInicio: ${d.fechaInicio || ''}\nFin: ${d.fechaFin || ''}\nEncargado: ${d.encargado || ''}\nNotas: ${d.notas || ''}\n`
  ).join("\n----------------\n");

  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `territorio_${num}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
};

window.exportarTerritorioCSV = async function () {
  await cargarDatos();
  const num = document.getElementById("exportNumero").value;
  const entradas = datos.filter(d => d.numero === Number(num));
  if (!entradas.length) return alert("No hay datos para ese territorio");

  const header = "Territorio,Inicio,Fin,Encargado,Notas\n";
  const filas = entradas.map(d =>
    `"${d.numero}","${d.fechaInicio || ''}","${d.fechaFin || ''}","${(d.encargado || '').replace(/\"/g, '""')}","${(d.notas || '').replace(/\"/g, '""')}"`
  ).join("\n");

  const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `territorio_${num}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

window.exportarTerritorioPDF = async function () {
  // Mantuvimos la misma aproximación simple de abrir nueva ventana e imprimir
  await cargarDatos();
  const num = document.getElementById("exportNumero").value;
  const entradas = datos.filter(d => d.numero === Number(num));
  if (!entradas.length) return alert("No hay datos para ese territorio");

  const contenido = entradas.map(d =>
    `Territorio: ${d.numero}\nInicio: ${d.fechaInicio || ''}\nFin: ${d.fechaFin || ''}\nEncargado: ${d.encargado || ''}\nNotas: ${d.notas || ''}\n`
  ).join("\n\n");

  const ventana = window.open("", "", "width=800,height=600");
  ventana.document.write(`<pre style="font-family: Arial, sans-serif; font-size:12px;">${contenido}</pre>`);
  ventana.document.close();
  ventana.print();
};

/* ============================
   Respaldar (descarga JSON con todos los documentos)
   ============================ */
window.respaldarDatos = async function () {
  await cargarDatos();
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo_territorios_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ============================
   Restaurar desde archivo (sobrescribe colección)
   ============================ */
window.restaurarDesdeArchivo = async function () {
  const archivo = document.getElementById("archivoRestaurar").files[0];
  if (!archivo) return alert("Selecciona un archivo .json de respaldo");

  const lector = new FileReader();
  lector.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("Formato inválido: se esperaba un array");

      // 1) eliminar todos los documentos actuales
      const snap = await getDocs(collection(db, "territorios"));
      // borrar con promesas
      const borrados = snap.docs.map(d => deleteDoc(doc(db, "territorios", d.id)));
      await Promise.all(borrados);

      // 2) añadir los del respaldo
      const agregados = parsed.map(item => addDoc(collection(db, "territorios"), item));
      await Promise.all(agregados);

      await cargarDatos();
      alert("Restauración completada");
    } catch (err) {
      console.error(err);
      alert("Archivo no válido o error al restaurar. Revisa la consola.");
    }
  };
  lector.readAsText(archivo);
};

/* ============================
   Botón Telegram (usa últimos resultados si hay)
   ============================ */
document.getElementById("btnTelegram").addEventListener("click", async () => {
  // usar lastResults si existen, si no, intentar filtrar por el número en el campo de búsqueda
  if (!lastResults || lastResults.length === 0) {
    // intenta tomar por filtroNumero si existe
    const filtro = document.getElementById("filtroNumero").value;
    if (!filtro) return alert("Realiza una búsqueda o escribe un número de territorio antes de enviar a Telegram");
    await cargarDatos();
    lastResults = datos.filter(d => d.numero == Number(filtro));
    if (lastResults.length === 0) return alert("No hay resultados para enviar");
  }

  const mensaje = lastResults.map((e) =>
    `📌 Territorio ${e.numero}\n🗓 ${e.fechaInicio || '-'} → ${e.fechaFin || '-'}\n👤 ${e.encargado || '-'}\n📝 ${e.notas || '-'}`
  ).join("\n\n");

  const url = `https://t.me/share/url?url=&text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
});

/* ============================
   Inicialización: cargar datos al abrir
   ============================ */
(async () => {
  await cargarDatos();
})();
