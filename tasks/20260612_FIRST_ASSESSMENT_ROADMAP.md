# FIRST_ASSESSMENT_ROADMAP.md

Este documento contiene las instrucciones precisas para que el motor de IA analice el repositorio completo de Servy y genere la documentación técnica base.

---

## 📋 INSTRUCCIONES PARA LA IA (PROMPT PRINCIPAL)
**Modalidad:**: Arma un plan para la ejecucion solicitada, evitando el uso elevado de tokens. 
**Skills:** Usa el skill find-skills para buscar el skill que precises para ejecutar el plan.
**Rol:** Actúa como un Arquitecto de Software Principal y Experto en Ingeniería Inversa de Código.
**Objetivo:** Analizar el repositorio completo del proyecto "Servy" para comprender su propósito de negocio, su estructura técnica y sus dependencias. Debes generar tres archivos Markdown (`PRODUCT_DESCRIPTION.md`, `ARCHITECTURE.md` y `GEMINI.md`) basados estrictamente en el código fuente actual.

Por favor, escanea todo el código (frontend en TypeScript/Vercel, backend en TypeScript/Railway, configuraciones de Redis y PostgreSQL) y genera los siguientes entregables:

---

### 1. Archivo: PRODUCT_DESCRIPTION.md
Genera un análisis funcional detallado del producto. El archivo debe incluir:
* **Visión General:** Qué problema resuelve Servy y cuál es su propuesta de valor según lo que deduces de los endpoints, interfaces y esquemas de datos.
* **Módulos / Aplicaciones:** Descripción funcional de las 4 aplicaciones detectadas (las 3 de Frontend y la de Backend). Explica qué rol cumple cada Front en la experiencia del usuario.
* **Flujos Principales de Usuario:** Mapeo de los casos de uso críticos (ej. Registro/Login, flujos de negocio principales, reportería, etc.).
* **Glosario de Términos del Negocio:** Definición de las entidades principales que maneja el sistema (ej. si maneja "usuarios", "servicios", "órdenes", etc.).

---

### 2. Archivo: ARCHITECTURE.md
Genera una radiografía técnica profunda del estado actual del sistema, dividida por módulos. Debe incluir:
* **Stack Tecnológico Detallado:** Versiones de TypeScript, Node.js, frameworks de Front (React/Next.js/Vue, etc.) y librerías clave de backend (Express, NestJS, Prisma, TypeORM, etc.).
* **Diagrama de Arquitectura Conceptual (en formato Mermaid.js):** Muestra cómo interactúan las 3 aplicaciones de Frontend (Vercel) con el Backend (Railway) y cómo este último se comunica con PostgreSQL y Redis.
* **Desglose por Módulo (Frontend x3 + Backend):**
    * Estructura de carpetas y patrones de diseño utilizados (o falta de ellos).
    * Estrategia de manejo de estado (en fronts) y manejo de rutas/controladores (en backend).
* **Persistencia y Caché:** * Esquema conceptual de la base de datos PostgreSQL (tablas y relaciones principales).
    * Casos de uso actuales de Redis (¿Sesiones, caché de consultas, colas de mensajes?).
* **Decisiones Técnicas Detectadas:** Patrones de concurrencia, middleware de seguridad, manejo de variables de entorno y lógica de integración.

---

### 3. Archivo: GEMINI.md
Este archivo servirá como la "Única Fuente de Verdad" (SSOT) y base de contexto para futuros desarrollos en este entorno de IA. Debe contener:
* **Resumen Ejecutivo del Estado del Código:** Diagnóstico técnico honesto sobre la mantenibilidad y legibilidad del código heredado.
* **Reglas de Estilo y Convenciones Detectadas:** Cómo está estructurado el código actual para mantener la consistencia en futuros *features* (estructuras de tipos, convenciones de nombres, manejo de errores).
* **Riesgos de Escalabilidad Inmediatos:** Identificación de posibles cuellos de botella (como abuso de `Promise.all()`, consultas $N+1$, o falta de índices en la base de datos).
* **Instrucciones de Contexto para Futuros Prompts:** Un bloque de texto listo para ser copiado y pegado en futuras sesiones, que le explique a cualquier IA cómo debe escribir código que se integre perfectamente con la arquitectura actual de Servy sin romper las reglas de negocio.

---

## 🛠️ REGLAS DE EJECUCIÓN (CONSTRAINTS)
1.  **Evita alucinaciones:** Si un flujo o tecnología no está explícitamente en el código o en los archivos de configuración (`package.json`, `Prisma schema`, etc.), no lo inventes. Agrégalo en una sección de "Por confirmar".
2.  **Formato Estricto:** Usa Markdown limpio, títulos jerárquicos (`#`, `##`, `###`) y bloques de código cuando sea necesario ilustrar un patrón.
3.  **Outputs Separados:** Asegúrate de escribir los tres archivos de manera independiente.