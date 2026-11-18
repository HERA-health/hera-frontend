const fs = require("node:fs");
const path = require("node:path");
const output = path.resolve(
  process.env.HERA_MARKETING_OUTPUT || "../output/marketing-demo",
);
const captures = path.resolve("../output/playwright/product");
fs.mkdirSync(captures, { recursive: true });
const secrets = JSON.parse(
  fs.readFileSync(path.join(output, "local-secrets.json"), "utf8"),
);
for (const role of ["professional", "clinic"]) {
  const login = `async page => {
  await page.setViewportSize({width:1600,height:1000});
  await page.goto('http://localhost:8088/login?userType=${role === "clinic" ? "CLINIC" : "PROFESSIONAL"}');
  await page.getByRole('textbox',{name:'tu@email.com'}).waitFor();
  const privacy=page.getByRole('button',{name:'Rechazar estadísticas de uso'});
  if(await privacy.isVisible())await privacy.click();
  await page.getByRole('textbox',{name:'tu@email.com'}).fill('${role === "clinic" ? "clinica" : "elena"}@example.test');
  await page.getByRole('textbox',{name:'Introduce tu contraseña'}).fill(${JSON.stringify(secrets.password)});
  await page.getByRole('button',{name:'Iniciar sesión',exact:false}).click();
  await page.getByRole('button',{name:'Navegar a Inicio',exact:true}).waitFor();
  if(await privacy.isVisible())await privacy.click();
 }`;
  fs.writeFileSync(path.join(output, `login-${role}.browser.js`), login);
}
for (const area of ["professional", "clinical", "clinic"]) {
  const script = fs
    .readFileSync(path.join(__dirname, `capture-${area}.template.js`), "utf8")
    .trimEnd()
    .replace(/;$/, "")
    .replaceAll("__CAPTURE_OUTPUT__", captures.replaceAll("\\", "/"));
  fs.writeFileSync(path.join(output, `capture-${area}.browser.js`), script);
}
console.log(
  "Local browser scripts prepared in " +
    output +
    ". Credentials remain outside the repository.",
);
