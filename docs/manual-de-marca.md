# Manual de marca Servy

Guía para redes, piezas gráficas y generación de imágenes con IA.  
Fuente de verdad visual: la landing de [servy.lat](https://servy.lat).  
Versión: septiembre 2026.

También: [1 página PDF](manual-de-marca-1pagina.pdf) · [prompts para IA](manual-de-marca-prompts.txt)

---

## 1. Qué es Servy (en una frase)

Servy conecta a alguien con un problema de hogar (canilla, luz, cerradura, gas, aire) con un técnico verificado. **Todo pasa por WhatsApp.** No es una app que hay que bajar.

**Promesa:** pedí un técnico por WhatsApp. Pagás la visita, si hacés el arreglo se descuenta. El dinero queda retenido hasta que el cliente confirma.

**No prometemos:** mismo día, “el mejor de la zona”, testimonios inventados, ratings falsos.

---

## 2. Personalidad

| Sí | No |
|---|---|
| Directo, rioplatense, de vos | Corporativo, “soluciones end-to-end” |
| Claro con precios y límites | Overpromise, urgencia falsa |
| Cercano, como un vecino que sabe | Infantil, memes random |
| Calmo y seguro (plata protegida) | Amarillista (“¡LLAMÁ YA!”) |
| Producto = WhatsApp + visita | Producto = “la app del futuro” |

**Voz:** segunda persona, frases cortas, precios con punto de miles argentino (`$55.000`).  
**CTA canónico:** `Hablar con Servy`.

---

## 3. Nombre y wordmark

| Uso | Cómo se escribe |
|---|---|
| Wordmark de marca | `servy.` (todo minúscula + punto) |
| Nombre en frase | Servy (mayúscula inicial) |
| Dominio / mail | servy.lat · soporte@servy.lat |

El **punto** es parte del logo. No lo saques. No uses `SERVY`, `ServY` ni un isotipo de llave/casa genérico.

**En la web** el wordmark es texto: Poppins Bold, `tracking-tighter`, color `#0D4638`.

Archivos en el repo:

- Wordmark: `apps/landing/public/servy-wordmark.png`
- Isotipo **S.** (serif, verde sobre blanco): `apps/landing/public/servy-logo.png`
- Perfil redes: `apps/landing/public/servy-facebook-profile.png`
- Portada Facebook: `apps/landing/public/servy-facebook-cover.png`

### Isotipo

Marca preferida para avatar / app icon / sticker:

- Letra **S.** (ese + punto) en serif clásico
- Color `#0D4638` sobre **blanco**
- O inverso: **S.** lima `#A7E23C` sobre fondo `#0D4638`

**Área de respeto:** alrededor del S. deja al menos el ancho del punto, vacío. No lo pongas sobre fotos recargadas ni lo estires.

**No:** drop shadow, 3D, outline neón, degradé en la letra, ícono de casa/llave/WhatsApp pegado al logo.

---

## 4. Color

 Paleta extraída de la landing. Usá estos HEX, no “un verde parecido”.

### Primarios

| Nombre | HEX | RGB | Uso |
|---|---|---|---|
| Verde bosque | `#0D4638` | 13, 70, 56 | Logo, botones de texto, bloques oscuros, wordmark |
| Verde noche | `#0B3A31` | 11, 58, 49 | Títulos (H1/H2) |
| Lima | `#A7E23C` | 167, 226, 60 | CTA, acento, “Por WhatsApp.”, hover |

**Regla de contraste:** lima **nunca** es color de texto sobre blanco (ilegible). Lima va sobre verde bosque, o como fondo de botón con texto `#0D4638`.

Texto sobre lima / botón CTA: siempre `#0D4638`, **nunca blanco**.

### Fondos y apoyo

| Nombre | HEX | Uso |
|---|---|---|
| Blanco | `#FFFFFF` | Cards, header |
| Menta papel | `#F2F9EF` | Fondos de sección, hero |
| Menta suave | `#C6F6DB` | Glow, chips, texto sobre verde oscuro |
| Pizarra 50 | `#F8FAFC` | Body fallback (`slate-50`) |
| Borde | `#F1F5F9` | `slate-100` |

### WhatsApp (solo en mocks de producto)

| Nombre | HEX | Uso |
|---|---|---|
| Header WA | `#075E54` | Barra del chat |
| Burbuja salida | `#DCF8C6` | Mensaje del cliente |
| Fondo chat | `#ECE5DD` | Cuerpo del hilo |
| Verde WA | `#25D366` | Avatar “S” en el mock |

No uses el verde de WhatsApp como color de marca Servy. Es contexto de producto, no identidad.

### Prohibido en marca

- Azul corporativo / “SaaS default”
- Naranja urgencia
- Negro puro en bloques grandes (usar `#0D4638`)
- Degradés arcoíris, glassmorphism recargado

---

## 5. Tipografía

**Familia:** [Poppins](https://fonts.google.com/specimen/Poppins) (Google Fonts).  
En la landing: pesos **400** (cuerpo) y **700** (títulos y botones).

| Rol | Peso | Tracking | Ejemplo |
|---|---|---|---|
| Wordmark `servy.` | 700 | muy cerrado (`tighter`) | header |
| H1 / H2 | 700 | tight | Pedí un técnico. |
| Cuerpo | 400 | normal | Canilla que pierde… |
| CTA / botones | 700 | normal | Hablar con Servy |
| Precio / dato | 700 | normal | Visita urgente $55.000 |

**Fallback:** `system-ui, sans-serif`.

**En Canva / Figma / IG:** descargá Poppins. Si no está, **Inter** o **Nunito Sans** Bold — nunca Times, nunca Comic Sans, nunca script.

**En IA (texto dentro de la imagen):** pedí *“bold geometric sans-serif similar to Poppins ExtraBold, Latin characters, correct Spanish accents”*. Las IA inventan letras: preferí **componer el texto después** en Canva/Figma sobre la imagen.

---

## 6. Forma y UI

De la landing, copiá esto en piezas:

- **Botones:** píldora (`rounded-full`), no rectángulo con esquinas 4px.
- **Cards:** `rounded-2xl` / `rounded-3xl`, borde muy suave, poca sombra.
- **Iconos:** Lucide, trazo simple, color `#0D4638` (no lima).
- **Radios grandes**, aire, no grillas densas tipo marketplace.

---

## 7. Copy para redes

### Fórmulas que ya funcionan

- Pedí un técnico. Por WhatsApp.
- Mandá mensaje a Servy.
- Visita urgente $55.000 · Programada $39.000 · Se descuenta del arreglo.
- Técnicos verificados. Plata retenida hasta que confirmás.

### Categorías (nombres oficiales)

Plomería · Electricidad · Cerrajería · Gas · Aires acondicionados

### Evitar

- “En minutos en tu puerta” / “mismo día garantizado”
- “Los mejores de [barrio]”
- Testimonios inventados
- “App Store / bajate la app”

---

## 8. Tamaños de redes

| Pieza | Tamaño (px) | Archivo de referencia |
|---|---|---|
| Avatar / perfil | 1080×1080 (mín. 320) | `servy-facebook-profile.png` / `servy-logo.png` |
| Portada Facebook | **1640×624** | `servy-facebook-cover.png` |
| Post feed IG/FB | 1080×1080 | — |
| Historia / Reel cover | 1080×1920 | — |
| Landscape / LinkedIn | 1200×627 | OG de la web es 1200×630 |

**Portada FB:** no pongas texto crítico abajo a la izquierda (ahí se superpone el avatar).

---

## 9. Cómo pedir imágenes a una IA

Pegá el bloque **Sistema** en todas las generaciones. Después sumá el prompt de la pieza.

### Sistema (copiar siempre)

```
Brand: Servy, WhatsApp-first home services in Argentina.
Visual identity:
- Primary dark forest green #0D4638
- Headline green #0B3A31
- Accent lime #A7E23C
- Soft mint backgrounds #F2F9EF and #C6F6DB
- White cards, lots of whitespace
- Typography vibe: Poppins Bold, geometric sans, not serif (except the S. logo mark)
- Logo mark: capital serif S followed by a period (S.) in #0D4638 on white, or lime S. on #0D4638
- Wordmark: lowercase "servy." with a period
- Buttons: pill-shaped, lime fill, dark green text
- Mood: calm, trustworthy, local Argentina, not corporate SaaS, not luxury, not cartoon
- Product is WhatsApp chat, NOT a native mobile app store listing
Do not: neon, 3D chrome, fake 5-star widgets, stock "happy family on couch", same-day guarantee badges, WhatsApp glyph as the brand logo, blue tech gradients.
If showing a phone: black iPhone, straight-on, WhatsApp conversation in Spanish (Argentina), contact name Servy.
Spanish in-image text must have correct accents (técnico, baño, rompió, línea). Prefer little or no text in the image.
```

### Prompt: post cuadrado (servicio)

```
Square 1080x1080 social post. Flat graphic, not a photo.
Background #F2F9EF. Centered dark green #0D4638 lowercase wordmark "servy." 
Below, one short Spanish line in Poppins-like bold: "Plomería por WhatsApp."
Small lime #A7E23C pill button with dark green text "Hablar con Servy".
No photos of people. No icons of houses. Generous padding.
```

### Prompt: historia 9:16

```
Vertical 9:16 story. Top two-thirds: dark forest green #0D4638 field.
Large lime #A7E23C serif "S." mark, centered.
Bottom third: mint #F2F9EF with Spanish headline "Pedí un técnico." in #0B3A31 bold.
No extra logos. No stock photography.
```

### Prompt: producto (iPhone + chat)

```
Product shot, 4:5 or 9:16. One black iPhone, front-facing, transparent or #F2F9EF background.
WhatsApp chat: header teal #075E54, contact Servy, green avatar with letter S.
Bubbles in Spanish: client says a household problem; Servy answers with urgente $55.000 or programado $39.000.
Correct accents. No duplicate words. No Facebook UI. No App Store frame.
```

### Prompt: portada / banner

```
Landscape banner 1640x624 (Facebook cover crop). Background #0D4638.
Left: large lime S. mark. Right: white "servy." and smaller "Pedí un técnico por WhatsApp."
Keep all type in the horizontal center band. Empty bottom-left (profile photo overlap).
Flat vector, no photos, no 3D.
```

### Prompt: foto “real” (si hace falta)

```
Photorealistic, Argentina home interior, natural daylight, not a luxury penthouse.
A plumber or electrician at work, no faces toward camera (or faces slightly turned away).
Color grade slightly pulled toward forest green, not teal-cyan TikTok.
Do not add logos in the photo; we overlay servy. later in Figma.
```

### Negative prompt (Midjourney / similares)

```
no App Store, no QR spam, no fake reviews, no 5 gold stars, no cartoon mascot,
no neon lime on white text, no Comic Sans, no Times New Roman body,
no English UI, no US suburb, no same-day badge, no Bitcoin, no robot
```

---

## 10. Flujo recomendado (IA + humano)

1. Generá el fondo / escena **sin texto** (o con muy poco).
2. En Canva/Figma: Poppins 700, colores HEX de este manual, CTA píldora.
3. Logo: pegá `servy-logo.png` o `servy-wordmark.png`, no redibujes el S.
4. Revisá: ¿el lima está sobre verde, no como texto sobre blanco? ¿Hay overpromise?

---

## 11. Checklist rápido

- [ ] `servy.` en minúsculas con punto, o isotipo **S.**
- [ ] CTA lima + texto `#0D4638`
- [ ] Títulos `#0B3A31` o blanco sobre `#0D4638`
- [ ] Poppins (o Inter) Bold / Regular
- [ ] Precios con `$55.000` (punto de miles)
- [ ] No se promete mismo día
- [ ] WhatsApp es el producto, no una app nativa
- [ ] Texto en español rioplatense, vos

---

## 12. Archivos

| Archivo | Para qué |
|---|---|
| `apps/landing/public/servy-logo.png` | Avatar, isotipo S. |
| `apps/landing/public/servy-wordmark.png` | Wordmark horizontal |
| `apps/landing/public/servy-facebook-cover.png` | Portada 1640×624 |
| `apps/landing/public/servy-facebook-profile.png` | Foto de perfil |
| `apps/landing/public/servy-app-iphone.png` | Mockup producto (hero) |
| `apps/landing/app/page.tsx` | Copy y composición de referencia |
