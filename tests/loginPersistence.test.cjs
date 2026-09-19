const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const loginSource = fs.readFileSync(path.join(__dirname, "..", "src", "pages", "Login.jsx"), "utf8");

test("Beni Hatırla Firebase local/session persistence seçimini girişten önce uygular", () => {
  assert.match(loginSource, /rememberMe \? browserLocalPersistence : browserSessionPersistence/);
  assert.ok(loginSource.indexOf("await setPersistence") < loginSource.indexOf("await signInWithEmailAndPassword"));
});

test("geçerli Firebase oturumu login ekranını gereksiz göstermeden ana sayfaya yönlendirir", () => {
  assert.match(loginSource, /onAuthStateChanged\(auth/);
  assert.match(loginSource, /if \(currentUser\) navigate\("\/", \{ replace: true \}\)/);
});

test("login alanları standart parola yöneticisi semantiğine sahiptir", () => {
  assert.match(loginSource, /name="email"[^>]*type="email"[^>]*autoComplete="username"/);
  assert.match(loginSource, /name="password"[^>]*type=\{showPassword \? "text" : "password"\}[^>]*autoComplete="current-password"/);
  assert.match(loginSource, /<form[^>]*autoComplete="on"/);
});

test("login ekranı şifreyi uygulama depolamasına yazmaz", () => {
  assert.doesNotMatch(loginSource, /localStorage|sessionStorage|document\.cookie|setDoc|addDoc/);
});
