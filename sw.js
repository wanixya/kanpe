// ネットがなくても開けるように、アプリのファイルをiPhoneにしまっておく仕組み
var CACHE = "kanpe2-v2";
var FILES = ["./", "./index.html", "./daihon.md", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png", "./BIZUDPGothic-Bold.ttf"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); }); }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 台本：ネットから取り直す。取れなければしまってある分を使う
  if (url.pathname.endsWith("/daihon.md")) {
    e.respondWith(Promise.race([fetch(url.pathname, { cache: "no-store" }), timeout(7000)]).then(function (r) {
      if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put("./daihon.md", cp); }); }
      return r;
    }).catch(function () { return caches.match("./daihon.md"); }));
    return;
  }

  // それ以外：しまってある分をすぐ使い、裏で新しいものに入れ替えておく
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (r) {
      if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return r;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
