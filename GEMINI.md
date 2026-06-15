# GEMINI.md

Este documento y los documentos mencionados aqui sirven como la **Única Fuente de Verdad (SSOT)** y base de contexto para cualquier agente de Inteligencia Artificial que deba interactuar, modificar o extender la base de código del proyecto **Servy**.

---

## 1. Instrucciones de Contexto Global
1. Todo cambio debe ejecutarse con la menor cantidad de tokens
2. Todo cambio debe ser propuesto y aprobado
3. Todo cambio debe quedar trackeado en git
4. Tomä el contexto de PRODUCT_DESCRIPTION.md, ARCHITECTURE.md, TEST_STRATEGY.md y /tasks donde se resguardan los planes ejecutados.
5. Activa el skill caveman full
6. Cada vez que se apruebe y ejecute un plan, el artifact ejecutado (implementation_plan. walkthrough, etc) debe agregarse a la carpeta tasks con la nomenclatura YYYYMMDD_ArtifactName, donde YYYY es el año, MM es el mes y DD es el dia.
7. Para realizar cambios con habilidades especiicas, busca el skill con find-skill

## 2. Contexto resumido.
Estás trabajando sobre el repositorio "Servy", una plataforma argentina de servicios para el hogar.
Reglas clave a seguir al escribir código:
1. Base de datos: Usa Prisma ORM. Los nombres de las columnas en PostgreSQL son snake_case y están mapeados en packages/db/prisma/schema.prisma.
2. WhatsApp Bot: Toda interacción conversacional del cliente se procesa a través de apps/api/src/services/conversation.service.ts y para técnicos se utiliza apps/api/src/services/professional.conversation.service.ts.
3. Comandos de WhatsApp: Los usuarios pueden escribir "cancelar", "ayuda" o "estado". No interceptes estos flujos operativos en los sub-agentes; la API Express los gestiona de forma centralizada.
4. Pagos: Servy cobra una tarifa de visita fija obligatoria (visit fee, parametrizada en env) mediante Mercado Pago antes de habilitar el chat directo/confirmar el técnico. El pago del arreglo final se realiza también a través de la plataforma y queda retenido hasta el escaneo del código QR del trabajo.
5. Estilo de código: TypeScript estricto, camelCase para variables y snake_case para mapear esquemas en DB. Los errores se delegan llamando a next(err) en los controladores.

## 3. Contexto general
Estos archivos poseen el contexto global de servy y son **Única Fuente de Verdad (SSOT)**. Siempre se deben mantener actualizados segun se modifique la descripcion del producto (PRODUCT_DESCRIPTION.md), la arquitectura o desiciones técnicas (ARCHITECTURE.md) o el backlog (BACKLOG.md)
1. PRODUCT_DESCRIPTION.md: Contiene la descripcion detallada de Servy y definiciones funcionales.
2. ARCHITECTURE.md: Contiene la arquitectura general de Servy y las definiciones tecnicas,
3. BACKLOG.md: Posee potencial backlog, funcional o tecnico
4. TEST_STRATEGY.md: Contiene la estrategia detallada de pruebas, herramientas, tipos de test y su cobertura.
