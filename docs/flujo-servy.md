# Flujo de Servy

Diagramas del producto actual (WhatsApp + visita como seña + arreglo).  
Para exportar a PNG/SVG: copiá un bloque ` ```mermaid ` en [mermaid.live](https://mermaid.live) → **Actions**.

Zona piloto: **Pilar, Buenos Aires**. Canal: **Twilio WhatsApp**. Pagos: **Mercado Pago**.

---

## 1. Arquitectura

```mermaid
flowchart LR
    subgraph Clientes
        WA[WhatsApp]
    end
    subgraph Fronts
        L[Landing<br/>servy.lat]
        A[Admin<br/>admin.servy.lat]
        P[Portal técnico<br/>portal.servy.lat]
    end
    subgraph Backend
        API[API Express]
        DB[(PostgreSQL)]
        R[(Redis sesiones)]
    end
    subgraph Externos
        TW[Twilio]
        MP[Mercado Pago]
        R2[Cloudflare R2]
    end

    WA <--> TW
    TW --> API
    API --> TW
    L --> API
    A --> API
    P --> API
    API --> DB
    API --> R
    API --> MP
    MP --> API
    API --> R2
```

---

## 2. Flujo completo (cliente + técnico)

```mermaid
flowchart TD
    A[Cliente escribe por WhatsApp] --> B[Describe el problema]
    B --> C{Urgente $55.000<br/>o Programado $39.000?}
    C --> D[Elige turno]
    D --> E[Servy asigna 1 técnico]
    E --> F{Técnico confirma?}
    F -->|No| G[Busca otro técnico<br/>hasta 3 intentos]
    G --> E
    F -->|Sí| H[Link Mercado Pago<br/>pago VISITA]
    H --> I[Cliente paga visita]
    I --> J[Job confirmado]
    J --> K[Visita in situ]
    K --> L[Técnico cotiza arreglo<br/>en el portal]
    L --> M[WhatsApp: desglose<br/>15% + 6% − visita]
    M --> N{Cliente acepta?}
    N -->|No| O[Fin / otro pedido]
    N -->|Sí| P[Link MP por la DIFERENCIA]
    P --> Q[Cliente paga arreglo]
    Q --> R[QR al cliente<br/>servy:qr:jobId]
    R --> S[Técnico escanea QR<br/>en portal autenticado]
    S --> T[Job completado]
```

---

## 3. Precios y comisiones (arreglo)

El técnico cotiza **mano de obra neta**. El cliente ve el markup. La visita ya pagada se descuenta.

```mermaid
flowchart TD
    V[Visita: cliente paga $39.000 o $55.000] --> C[Técnico cotiza mano de obra<br/>ej. $100.000]
    C --> X["Subtotal al cliente:<br/>$100.000 + 15% Servy + 6% procesamiento<br/>= $121.900"]
    X --> Y[Menos visita ya pagada]
    Y --> Z["MP cobra solo la diferencia<br/>ej. $82.900"]
    Z --> Q[QR confirma el trabajo]
    Q --> T[Técnico recibe $100.000 íntegros<br/>payout aún no automático]
```

**Fórmula** (`apps/api/src/services/repair-pricing.ts`):

```
mano de obra
+ 15% comisión Servy
+ 6% sobre (mano de obra + comisión)
− visita ya abonada
= monto del link de Mercado Pago
```

---

## 4. Estados (backend)

```mermaid
stateDiagram-v2
    [*] --> awaiting_speed: Cliente pide servicio
    awaiting_speed --> scheduling: Elige urgente / programado
    scheduling --> awaiting_tech: Turno elegido, técnico asignado
    awaiting_tech --> visit_paid: Técnico confirma y cliente paga visita
    awaiting_tech --> cancelled: Timeouts / rechazos
    visit_paid --> [*]: Sigue el Job
```

```mermaid
stateDiagram-v2
    [*] --> pending: Oferta al técnico
    pending --> held: Técnico confirma
    pending --> expired: No confirma a tiempo
    held --> quoted: Cotiza el arreglo
    held --> expired: Cliente no paga visita
```

```mermaid
stateDiagram-v2
    [*] --> confirmed: Pago visita aprobado
    confirmed --> in_progress: Pago arreglo aprobado
    in_progress --> completed: Técnico escanea QR
```

---

## 5. Matching y timeouts

```mermaid
flowchart TD
    R[ServiceRequest con turno] --> M[Matching: categoría, zona,<br/>perfil completo, urgent/scheduled]
    M --> A[1 JobOffer pending]
    A --> T{Confirma en ~20 min?}
    T -->|Sí| H[held + link de visita<br/>vence en ~30 min]
    T -->|No| X[expired]
    X --> N{Intentos < 3?}
    N -->|Sí| M
    N -->|No| C[Pedido cancelado]
```

---

## 6. Apps del monorepo

| App | URL típica | Rol |
|-----|------------|-----|
| `apps/api` | API / Railway | Webhooks, matching, pagos, crons |
| `apps/landing` | servy.lat | Sitio público |
| `apps/admin` | admin.servy.lat | Operación interna |
| `apps/pro-portal` | portal.servy.lat | Cotizar, jobs, escanear QR |

El **cliente final no usa web**: todo el pedido es WhatsApp.
