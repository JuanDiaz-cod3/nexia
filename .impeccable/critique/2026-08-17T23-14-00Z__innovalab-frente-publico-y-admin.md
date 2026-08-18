---
target: innovalab-frente-publico-y-admin
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-17T23-14-00Z
slug: innovalab-frente-publico-y-admin
---
Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence — B was restarted once after an accidental interruption; the retry completed cleanly)

# Crítica enfocada — LandingPage, HomePage (Inicio), controles de admin en ProjectsPage

Fuera de alcance: `LoginPage.tsx` (ya tuvo su propia ronda, 25/40) y `MyProjectPage.tsx` (sin cambios esta sesión).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Buenos estados de carga, pero sin confirmación de éxito tras guardar/borrar; los botones no cambian de texto mientras `editLoading`/`deleteLoading` está activo, solo se deshabilitan en silencio |
| 2 | Match Between System and Real World | 2 | `.project-status` muestra el enum crudo de la DB (`draft`) sin traducir, en una UI que por lo demás está toda en español |
| 3 | User Control and Freedom | 3 | Cancelar siempre presente (form de edición, confirmación de borrado); falta Esc para cancelar |
| 4 | Consistency and Standards | 2 | No existe variante `danger` de `Button` — "Sí, borrar" es visualmente idéntico a "Guardar cambios"; `.home-tag` y `.project-status`/`.project-category` usan dos tonos de ámbar distintos para el mismo rol semántico (pill de categoría) |
| 5 | Error Prevention | 2 | El borrado tiene confirmación (bien) pero cero peso visual proporcional a lo irreversible que es; salir de una edición a mitad de camino descarta cambios en silencio, sin aviso |
| 6 | Recognition Rather Than Recall | 2 | El formulario de edición inline no dice qué proyecto se está editando — carga pura de memoria |
| 7 | Flexibility and Efficiency of Use | 1 | Sin atajos de teclado, sin edición/borrado en lote para admin — justo la pantalla (gestionar muchos proyectos) donde más ayudaría |
| 8 | Aesthetic and Minimalist Design | 3 | Landing está casi perfecta; los dos paneles "Próximamente" de Inicio son peso muerto por ahora; los controles de admin agregan ruido real a cada tarjeta |
| 9 | Error Recovery | 3 | Errores en línea, cerca del origen, en español llano; pero el catch-all genérico "No se pudo conectar con el servidor." cubre cualquier falla, sin validación por campo |
| 10 | Help and Documentation | 0 | Nada — ningún tooltip explica qué significa `draft`, ni ninguna otra ayuda en las tres pantallas |
| **Total** | | **20/40** | **Aceptable (al límite de Pobre) — mejoras importantes antes de sentirse terminado** |

## Veredicto de especificidad de diseño

**Landing (excelente) → Inicio (fuerte, con algunas costuras genéricas) → controles de admin en Proyectos (genérico, rompe el patrón).**

- **LandingPage.tsx** es genuinamente propio: el monograma "IL" en doble anillo flanqueado por "EST. / 2026", el wordmark serif "INNOVALAB" en navy/dorado, la tagline itálica "Investigación que permanece", y el pie mono "INSTITUTO LA SALLE · ARCHIVO DE INVESTIGACIÓN". Nada de esto es intercambiable con otro producto.
- **HomePage.tsx** sostiene la línea casi todo el tiempo: las 4 frases rotativas son reales y con atribución correcta (Szent-Györgyi, Eliot, Mao Tse Tung, Bunge) — un detalle específico que la mayoría de apps resuelve con lorem-ipsum. El placeholder honesto "—" para "Estudiantes activos" (en vez de inventar un 0) es una buena decisión de restricción. Donde se resbala: los paneles laterales "Notificaciones"/"Ranking de proyectos" son boilerplate genérico de dashboard SaaS, y `.home-seal` es un simple `✓` — no la identidad real del sello.
- **Los controles de admin en ProjectsPage** son donde la especificidad colapsa. Editar/Borrar como botones outline planos, un formulario inline pelado, una píldora ámbar de "draft" — esto es markup textbook de CRUD-admin. Nada ahí (ni número de catálogo mono, ni sello, ni tratamiento del wordmark) señala "el archivo de InnovaLab" en vez de cualquier otro admin genérico.

**Escaneo determinístico (detector):** el escaneo CLI sobre el código fuente de los tres archivos salió limpio (`[]`, 0 hallazgos) — es un scanner de texto estático, no ve estilos computados. El escaneo inyectado en el navegador (que sí lee CSS computado/contraste) encontró: Landing 2 anti-patrones (jerarquía tipográfica plana, paleta "cream/beige"), Inicio 11 (contraste bajo en el eyebrow "BIENVENIDO A" y el párrafo del hero, texto funcional subdimensionado en 3 lugares, texto gris sobre fondo de color en las píldoras "PRÓXIMAMENTE"×2, entre otros), Proyectos 11 (contraste bajo en categoría/status, espaciado monótono ~4px en 90%+ de los casos). Dos hallazgos del detector son **falsos positivos confirmados**: "paleta cream/beige" y "fuente Inter sobreusada" son decisiones intencionales documentadas en el sistema de diseño del proyecto (`#FAF7F1` e Inter son tokens fijos), no patrones genéricos accidentales.

## Carga cognitiva

Fallan 3 de 8 ítems del checklist (moderada, atender pronto):
1. **Foco único — falla (Proyectos, vista admin).** Una tarjeta que era archivo de solo lectura ahora carga título/resumen/integrantes/status *y* Editar/Borrar *y* potencialmente un formulario completo, todo compitiendo en la misma tarjeta.
2. **Jerarquía visual — falla (Proyectos).** `.project-category` y `.project-status` son dos píldoras ámbar del mismo peso — nada distingue "esta es la categoría de investigación" de "este es el estado del flujo" sin leer el texto.
3. **Memoria de trabajo — falla (form de edición).** Sin un "Editando: {título}", el admin tiene que recordar qué tarjeta tocó, sobre todo si ya hizo scroll.

## Viaje emocional

Landing → Entrar → Inicio es un pico bien construido: la animación de entrada del sello/monograma, la tagline, y un hero que continúa el mismo lenguaje navy/dorado. Es una puerta de entrada pensada, no un desvío vacío.

Donde se rompe: la tagline promete **"Investigación que permanece"** — y borrar el proyecto real de un estudiante (irreversible, datos reales de Supabase) termina en un botón **idéntico** a "Guardar cambios". El momento de mayor riesgo de toda la app recibe el menor cuidado visual de cualquier interacción revisada.

## Fortalezas

1. **El sello de Landing** (`LandingPage.tsx:18-59`) — anillos EST./2026, monograma en doble anillo, wordmark partido en color: confiado y correctamente navy/dorado (no la versión monocroma-embossed que se probó y se revirtió a pedido tuyo).
2. **El rotador de frases de Inicio** (`HomePage.tsx:19-36`) — citas reales, curadas, con atribución real, combinado con el placeholder honesto "—" en vez de inventar un dato.
3. **Estados vacíos/de carga honestos** — "Todavía no hay proyectos registrados. Cuando alguien cree el primero, aparece acá." se lee como escrito por una persona, no una plantilla.

## Problemas prioritarios

**[P1] Falla de contraste WCAG en las píldoras de categoría/status de ProjectsPage, verificado contra los tokens reales — corroborado independientemente por las dos evaluaciones.** `.project-status` (`ProjectsPage.css:38-45`) pone `color: var(--color-accent)` (#e8a23a) sobre `background: var(--color-accent-bg)` (#fbebd2) — contraste calculado **≈1.85:1**, muy por debajo del 4.5:1 de WCAG AA. `.project-category` (`ProjectsPage.css:21-25`) pone el mismo #e8a23a directo sobre la tarjeta blanca — **≈2.17:1**, también falla. El propio `HomePage.css` ya resuelve esto bien en `.home-tag` (`color: #8a5c14`), que pasa en **≈4.95:1** — la solución ya existe en el código y no se reutilizó acá.
*Fix:* usar el mismo `#8a5c14` (o promoverlo a un token compartido `--color-accent-text`) en `.project-status`/`.project-category`.

**[P1] La acción destructiva no tiene estilo de "peligro".** `Button.tsx`/`Button.css` solo definen `primary`/`secondary` — no existe `danger`. "Sí, borrar" (`ProjectsPage.tsx:201-207`) es un `&lt;Button&gt;` normal, mismo navy que "Guardar cambios" y "Explorar proyectos →". Para borrar de forma irreversible el proyecto real de un estudiante, no hay ninguna señal de color/peso en el momento exacto donde más importa. Además "Editar" y "Borrar" comparten el mismo `variant="secondary"` — mismo peso visual para una acción neutra y una destructiva, incluso antes de llegar al paso de confirmación.
*Fix:* agregar una variante `danger` a `Button.tsx` y aplicarla solo a la confirmación de borrado.

**[P1] El formulario de edición inline no dice qué proyecto está editando.** Al tocar "Editar", la tarjeta se reemplaza por campos sueltos (`ProjectsPage.tsx:135-171`) sin ningún encabezado. Con más de dos o tres proyectos en la lista, se vuelve real el problema de "¿cuál estoy editando?".
*Fix:* agregar `&lt;h3&gt;Editando: {project.title}&lt;/h3&gt;` dentro del Card de edición.

**[P2] "El sello" está implementado como un checkmark genérico — lo que CLAUDE.md prohíbe explícitamente.** El sistema de diseño dice que el sello "Reemplaza cualquier ícono genérico de check/palomita" para proyectos publicados. `.home-seal` (`HomePage.tsx:134-136`) renderiza un `✓` literal — exactamente lo que la regla dice evitar — y no comparte nada de la identidad real del sello de Landing (los anillos, el monograma).
*Fix:* reutilizar una versión reducida del sello de Landing (o al menos quitar el checkmark) para que el sello se lea igual en cualquier lugar donde aparezca.

**[P2] ProjectsPage es el único de los tres archivos sin ningún `@media query` — sin breakpoint responsive.** `LandingPage.css` y `HomePage.css` sí definen `@media (max-width: 640px/900px)`; `ProjectsPage.css` no tiene ninguno. Es probable que el layout (lista flex de una columna) reflowee razonablemente igual, pero es un vacío no verificado — el ancho móvil real no se pudo confirmar en esta ronda por una limitación de la herramienta de captura, no del producto.

## Personas

**Sam (Accesibilidad):**
- Las dos fallas de contraste de arriba (`.project-status` ≈1.85:1, `.project-category` ≈2.17:1) fallan WCAG AA directamente para usuarios de baja visión.
- Ni el formulario de edición ni el bloque de confirmación de borrado mueven el foco ni anuncian el cambio (sin `aria-live`, sin foco programático al campo Título ni al bloque de confirmación) — un usuario de lector de pantalla no recibe ninguna señal de que el contenido de la tarjeta acaba de cambiar debajo suyo.
- El significado de la píldora "draft" se transmite solo por color/texto en inglés técnico, sin alternativa.

**Riley (Stress-tester):**
- `editingId` y `confirmingDeleteId` son estados totalmente independientes — nada impide tener el Proyecto A a mitad de edición y el Proyecto B en confirmación de borrado al mismo tiempo, una combinación sin probar.
- Navegar fuera a mitad de una edición (Inicio/Mi Proyecto, o atrás del navegador) descarta los cambios sin avisar.
- El enum `draft` crudo filtrándose en `.project-status` es justo el tipo de "se ve traducido en todos lados menos acá" que este perfil detecta.

**Casey (Mobile):** *(el ancho móvil real (~390px) no se pudo verificar en vivo esta ronda — una herramienta de resize de ventana no funcionó en la sesión; no es un hallazgo del producto)*. Lo que sí es evidencia directa del código fuente: `ProjectsPage.css` es el único de los tres archivos sin ningún `@media query`, un vacío real de rigor responsive frente a Landing y Home, que sí lo tienen.

## Observaciones menores

- El motivo de doble anillo/monograma de Landing se hace eco visualmente de "el sello" (doble trazo + color accent) aunque CLAUDE.md reserva ese lenguaje exacto para status `published` — vale la pena una decisión consciente sobre si ese eco es intencional.
- El detector del navegador también marcó, en Inicio: contraste bajo en "BIENVENIDO A" (el eyebrow) y en el párrafo del hero, texto funcional subdimensionado en las etiquetas de sección del sidebar y en el tag "Ciencias ambientales", y texto gris sobre fondo de color en las píldoras "PRÓXIMAMENTE" — ninguno verificado con ratio exacto todavía, pero coherente con el patrón de contraste ya confirmado en Proyectos; vale la pena una pasada de contraste completa.
- El detector marcó "espaciado monótono" en Proyectos (~4px usado en más del 90% de los casos) — podría reflejar que los nuevos controles de admin están usando el paso más chico de la escala casi en exclusiva, sin aprovechar el resto del ritmo de espaciado del sistema.
- El "crossfade" de las frases rotativas no es tal: `.home-quote-content` solo define un fade-**in** (`home-quote-fade`, opacity 0→1) disparado por `key={quoteIndex}` — la frase saliente desaparece de golpe al desmontar, y recién ahí entra la nueva con fundido. Se confirmó en vivo: una captura a mitad de transición mostró el banner en blanco un instante antes de que apareciera la frase de Eliot. Se siente como parpadeo-y-luego-fundido, no como el fundido cruzado que el resto de la superficie de vidrio sugiere.
- Los indicadores de foco (`Button.css:11-14`, outline navy 2px) están presentes y son alcanzables por teclado en todos los controles de admin — una base sólida que la falta de manejo de foco (ver Sam) no aprovecha del todo.

## Preguntas para pensar

1. La tagline dice "Investigación que permanece" — ¿el botón que borra esa misma investigación para siempre debería verse igual que "Guardar cambios"?
2. CLAUDE.md define el sello como el elemento que nunca debe ser un checkmark genérico — ¿por qué la única instancia real que se construyó es justo un `✓`?
3. Landing e Inicio recibieron breakpoints móviles esta sesión; la capa de admin en Proyectos no. ¿Fue una decisión consciente dejar admin-en-mobile fuera, o simplemente no se llegó?
