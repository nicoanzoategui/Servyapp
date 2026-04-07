# FASE 7 — Separar la API en servicios (referencia)

> Cuándo: equipo > 3 devs, >10k servicios/mes, o proceso Node > 512MB RAM estable.

## Arquitectura propuesta

```
apps/
├── api-bot/          # Solo webhook WhatsApp + ConversationService
├── api-agents/       # Los agentes + crons
├── api-public/       # Portal pro y admin
└── api-webhooks/     # MP, Twilio, Meta
```

Comunicación entre servicios: Redis pub/sub o BullMQ (ya en uso).

Este repo sigue siendo un solo paquete `@servy/api` hasta que se cumplan los criterios anteriores.
