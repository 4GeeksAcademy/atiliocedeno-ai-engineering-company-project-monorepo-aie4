# HealthCore — inventario de frontend histórico

Fecha: 2026-11-05. Base inspeccionada y publicada: `9c9f121`.
Retirada controlada autorizada: únicamente las dos copias `public/aplication*.html`. Los originales website y el resto de entregables se conservan.
La ausencia de referencias internas no demuestra ausencia de consumidores externos.

## Función, consumidores y decisión

| Elemento | Clasificación / función | ¿Next lo necesita? | Referencias / diferencias | Decisión propuesta |
| --- | --- | --- | --- | --- |
| `index.html`, `index.en.html` raíz | Entregable académico anterior | No | Referencias mutuas, `style.css`, formularios bajo `uis/website/`, `/login`, `/talents`; `src/index_test.html` enlaza al español. Diferentes de website y public. | Conservar; archivarlos requiere ajustar enlaces y confirmar entrega/hosting. |
| `style.css` raíz | Asset histórico activo | No | Ambos HTML raíz lo cargan. Idéntico a website/public. | Conservar: igualdad no implica que pueda eliminarse sin romper rutas. |
| `validation.js` raíz | Copia redundante aparentemente sin consumidor | No | Idéntico a website; ningún HTML raíz conservado lo importa. Las referencias relativas de los formularios website resuelven a website, no a raíz. | Candidato a retirar tras aprobación de compatibilidad externa/académica. |
| `uis/website/index*.html` | Entregable estático bilingüe | No | Servidor estático, navegación ES/EN y referencias desde documentación. No idénticos a raíz/public. | Conservar. |
| `uis/website/aplication*.html` | Formularios académicos estáticos | No | Referenciados por landing raíz, landing website y servidor. Idénticos a las copias public retiradas, distintos de los React actuales. | Conservar como copia histórica canónica; no restaurar duplicados raíz. |
| `uis/website/style.css`, `validation.js` | Recursos activos del entregable | No | Cargados por HTML website y servidos por allowlist. | Conservar. |
| `uis/talent-pipeline-tracker/public/aplication*.html` | Duplicados exactos de formularios históricos | No para rutas actuales | Next redirige antes de servirlos; importan `validation.js`, ausente en public. No son un formulario standalone completo. | Retirados con autorización explícita; redirects y originales website conservados. |
| `uis/talent-pipeline-tracker/public/index*.html` | Copias históricas divergentes, no duplicados exactos | No para rutas actuales | Redirigidos por Next; difieren de website en navegación y de raíz en destinos CTA. | Decidir archivo académico antes de retirar; no tratarlos como idénticos. |
| `uis/talent-pipeline-tracker/public/style.css` | Asset público histórico | No para los componentes actuales | Referenciado por las dos landing public conservadas, accesible en `/style.css`; idéntico a raíz/website. | Retirada condicionada a decisión sobre public HTML y consumidores de esa URL. |
| `app/public-site/` | Frontend activo React/TSX, CSS y comportamiento | Sí | Cuatro `page.tsx` importan LandingEs/En y CareEs/En; componentes importan CSS propio; care-shell importa care-behavior. | Conservar íntegro; no es copia equivalente de los HTML. |
| `scripts/serve-website.mjs` | Servidor de compatibilidad/evaluación estática | No | `package.json` raíz y README; allowlist sirve exclusivamente website y alias `/en/`. | Conservar: cumple una función comprobada. |
| `package.json` raíz | Entrada de ejecución académica | No para build Next | `serve:website` ejecuta el servidor anterior. | Conservar. |
| `next.config.ts` redirects | Compatibilidad activa | Sí para URLs antiguas | Cuatro URLs `.html` redirigen a rutas React sin necesitar sus archivos HTML. | Conservar incluso si se aprueba retirar copias. |

## Comparación de contenido

Comparación byte a byte y SHA-256 realizada nuevamente antes de retirar las dos copias; evidencia previa a la eliminación:

- `uis/website/aplication.html`, `uis/talent-pipeline-tracker/public/aplication.html`: idénticos. SHA-256: `c552776ff1e4464b6c01fef506c04141e104d3ee6f7aced15c2507fcf8876005`.
- `uis/website/aplication.en.html`, `uis/talent-pipeline-tracker/public/aplication.en.html`: idénticos. SHA-256: `8362c6fae8cd06394a53667727bf3e36ad08477652923884f85e54772317d836`.
- `style.css`, `uis/website/style.css`, `uis/talent-pipeline-tracker/public/style.css`: idénticos. SHA-256: `b562d5a4d58eefc20d5fb8e486580baa7634aef45e0fdac1b08d777a38d89253`.
- `validation.js`, `uis/website/validation.js`: idénticos. SHA-256: `906e363d5588bccfca06c5ac9ea733c651896fdc33e29136ee204e165ed20935`.

Las tres variantes de cada landing tienen hashes diferentes. Raíz vs website:
website añade Inicio/Home; raíz añade enlaces al Tracker y dirige los CTA a
`uis/website/aplication*.html`. Public conserva CTA relativos `aplication*.html`.
El CSS activo `public-site.css` usa selectores `.public-site`; no es intercambiable
con el CSS histórico. Los formularios React tienen las correcciones de demostración
y accesibilidad aprobadas; las copias HTML históricas no recibieron esas correcciones.

## Referencias y límites comprobados

- `git grep` de `validation.js` y `style.css`: consumidores ejecutables identificados arriba.
- El backoffice referencia `/style.css` en su propio origen; no se cambió su hosting ni sus assets. No asumir que depende del asset público Next sin un montaje compartido documentado.
- README raíz, índices `uis/`, README website/frontend y memoria describen estas variantes.
- Auditorías antiguas conservan afirmaciones históricas sobre archivos ya retirados; no se reescribieron como si fueran verificaciones actuales.
- El servidor website permite GET/HEAD y solo sirve su allowlist; no ofrece auth ni Tracker.
- El significado académico exacto de cada variante y consumidores externos no se pueden decidir mediante búsquedas locales.

## Validación del inventario previo a la retirada

- Next: `/`, `/en`, `/care-request`, `/en/care-request`: HTTP 200.
- Next: cuatro URLs HTML antiguas: HTTP 308 a sus rutas canónicas.
- Next: `/style.css`: 200; `/validation.js`: 404 (los HTML public están redirigidos).
- Servidor histórico: cuatro rutas públicas, CSS, JS y alias `/en/validation.js`: 200.
- Servidor histórico: `/login` y `/talents`: 404; limitación documentada sin reescribir HTML.
- Se reutilizó el build validado de fase 2. No se repitieron tests, typecheck ni build porque no cambió código, configuración, dependencias ni assets.
- `git diff --check`: sin errores.

## Decisiones de limpieza

1. Conservar raíz, website, React activo y servidor estático.
2. EJECUTADO con autorización: retirados únicamente los dos `public/aplication*.html`. Se conservaron website y redirects.
3. Decidir explícitamente si las landing public deben archivarse como variantes académicas; no borrarlas como duplicados exactos.
4. Evaluar después `public/style.css` y `validation.js` raíz, confirmando consumidores externos y política académica. No tocar CSS raíz/website.
5. Validar la retirada con tests, typecheck, build y matriz HTTP. Las restantes propuestas siguen pendientes de autorización; no se requiere migrar páginas ni tocar FastAPI o Tracker.

## Validación posterior a la retirada autorizada

- Frontend: 15/15 tests PASS; typecheck y build Next.js PASS.
- Next: cuatro rutas públicas y `/style.css` HTTP 200; cuatro URLs HTML históricas HTTP 308 con destinos canónicos correctos.
- Servidor histórico: cuatro rutas públicas, cuatro URLs HTML y CSS/JS (incluidos alias `/en/`) HTTP 200.
- Solo se eliminaron `public/aplication.html` y `public/aplication.en.html`; originales website, redirects, servidor, landing public y recursos permanecen intactos.
- Cambios documentales anteriores conservados. Sin commit/push; `git diff --check` PASS.
