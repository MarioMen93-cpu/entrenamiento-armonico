// Service worker: deja que la app abra y funcione sin conexión una vez instalada.
//
// - La página (index.html) va "primero a la red": con internet siempre se baja la versión más
//   nueva (así, al editar y recargar, se ven los cambios de inmediato); sin internet se usa la
//   última copia guardada.
// - Drones, tipografía e íconos van "primero a lo guardado": casi no cambian y así cargan al
//   instante. Si se cambia alguno, sube VERSION para que se vuelvan a descargar.
const VERSION = "armonico-v2";
const RECURSOS = [
  "./",
  "./index.html",
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
  "./iconos/apple-touch-icon.png"
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
          // solo se guarda la página de la app y solo si llegó bien (nunca un error 404)
          const ruta = new URL(req.url).pathname;
          if (resp.ok && (ruta.endsWith("/") || ruta.endsWith("/index.html"))) {
            const copia = resp.clone();
            caches.open(VERSION).then((c) => c.put("./index.html", copia));
          }
          return resp;
        })
        .catch(() => caches.match("./index.html"))
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
