// script.js usando Supabase (CDN)
// Requiere incluir antes en el HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Inicializar Supabase con tu proyecto
const SUPABASE_URL = "https://zhqchgfthrtkpmqrstwv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpocWNoZ2Z0aHJ0a3BtcXJzdHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5Mjc3OTMsImV4cCI6MjA3MDUwMzc5M30.eYrq9dvG_gAqb6xeoUvDNoyUMGRGkZAgA9S41P-ix3s";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado local
let datos = [];
let lastResults = [];

// Función para cargar datos desde Supabase
async function cargarDatos() {
  const { data, error } = await supabase.from('territorios').select('*');
  if (error) {
    console.error("Error cargando datos:", error);
    datos = [];
  } else {
    datos = data;
  }
}

// Tabs (igual que antes)
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Guardar nueva entrada -> Supabase
document.getElementById("territorioForm").addEventListener("submit", async e => {
  e.preventDefault();
  const entrada = {
    numero: document.getElementById("numero").value,
    fechaInicio: document.getElementById("fechaInicio").value || null,
    fechaFin: document.getElementById("fechaFin").value || null,
    encargado: document.getElementById("encargado").value,
    notas: document.getElementById("notas").value
  };

  const { error } = await supabase.from('territorios').insert([entrada]);

  if (error) {
    console.error("Error guardando:", error);
    alert("Error al guardar. Revisa la consola.");
  } else {
    await cargarDatos();
    e.target.reset();
    alert("Entrada guardada");
  }
});

// Buscar (usa datos cargados y filtra)
window.buscarEntradas = async function () {
  await cargarDatos(); // refresca siempre
  const num = document.getElementById("filtroNumero").value;
  const enc = document.getElementById("filtroEncargado").value.toLowerCase();
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;
  const contenedor = document.getElementById("resultados");
  contenedor.innerHTML = "";

  const filtrado = datos.filter(d => {
    const fecha = d.fechaInicio || "";
    return (!num || d.numero == num) &&
           (!enc || (d.encargado || "").toLowerCase().includes(enc)) &&
           (!desde || fecha >= desde) &&
           (!hasta || fecha <= hasta);
  });

  lastResults = filtrado;

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

// Eliminar (por id)
window.eliminarEntrada = async function (id) {
  if (!confirm("¿Eliminar esta entrada?")) return;
  const { error } = await supabase.from('territorios').delete().eq('id', id);
  if (error) {
    console.error("Error eliminando:", error);
    alert("No se pudo eliminar.");
  } else {
    await buscarEntradas();
  }
};

// Exportar funciones igual que antes, puedes adaptarlas o pedirme si quieres

// Inicialización
(async () => {
  await cargarDatos();
})();
