// Service worker: deja que la app abra y funcione sin conexión una vez instalada.
//
// - La página (index.html) va "primero a la red": con internet siempre se baja la versión más
//   nueva (así, al editar y recargar, se ven los cambios de inmediato); sin internet se usa la
//   última copia guardada.
// - Drones, tipografía e íconos van "primero a lo guardado": casi no cambian y así cargan al
//   instante. Si se cambia alguno, sube VERSION para que se vuelvan a descargar.
const VERSION = "armonico-v6";
const RECURSOS = [
  "./",
  "./index.html",
  "./privacidad.html",
  "./manifest.webmanifest",
  "./drones/cello.mp3",
  "./drones/tanpura.mp3",
  "./drones/shruti.mp3",
  "./fuentes/Manrope-Regular.ttf",
  "./fuentes/Manrope-SemiBold.ttf",
  "./fuentes/Manrope-Bold.ttf",
  "./fuentes/Manrope-ExtraBold.ttf",
  "./iconos/icono.svg",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
  "./iconos/apple-touch-icon.png",
  "./iconos/icono-maskable-512.png",
  "./medios/despierta.mp4"
];

self.addEventListener("install", (e) => {
  // "reload": al instalar se baja todo directo del servidor, no de la memoria del navegador
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(RECURSOS.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const esPagina = req.mode === "navigate" || req.destination === "document";
  if (esPagina) {
    e.respondWith(
      // "no-cache": siempre se revalida con el servidor; si no, el navegador podía responder con
      // una copia vieja de su propia memoria y al editar y recargar no se veían los cambios
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
        .then((resp) => {
          // se guarda solo si llegó bien (nunca un error 404); la app va bajo "./index.html"
          const ruta = new URL(req.url).pathname;
          if (resp.ok) {
            const esApp = ruta.endsWith("/") || ruta.endsWith("/index.html");
            const copia = resp.clone();
            caches.open(VERSION).then((c) => c.put(esApp ? "./index.html" : ruta, copia));
          }
          return resp;
        })
        .catch(() => {
          // sin conexión: la app siempre sale de "./index.html", la copia más nueva (la de "./"
          // es la del día en que se instaló y puede ser vieja)
          const ruta = new URL(req.url).pathname;
          const esApp = ruta.endsWith("/") || ruta.endsWith("/index.html");
          return (esApp ? caches.match("./index.html") : caches.match(req, { ignoreSearch: true }))
            .then((r) => r || caches.match("./index.html"));
        })
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((guardado) => guardado || fetch(req).then((resp) => {
      if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); }
      return resp;
    }))
  );
});
