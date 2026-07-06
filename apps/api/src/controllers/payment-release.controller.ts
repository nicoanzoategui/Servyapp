import { Request, Response } from 'express';

/** Ruta legacy deshabilitada: la liberación de pago se hace vía portal (escaneo QR autenticado). */
export const releasePayment = async (_req: Request, res: Response) => {
    res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: system-ui; padding: 20px; text-align: center; }
                .warn { color: #b45309; margin-top: 40px; }
            </style>
        </head>
        <body>
            <h1 class="warn">Enlace desactualizado</h1>
            <p>La liberación de pago ahora la realiza el técnico desde el portal Servy escaneando el QR del cliente.</p>
        </body>
        </html>
    `);
};
