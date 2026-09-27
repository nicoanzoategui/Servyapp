/** E.164 sin + (wa.me). Env opcional: NEXT_PUBLIC_WA_NUMBER */
export const WA_NUMBER = (process.env.NEXT_PUBLIC_WA_NUMBER || '16206474920').replace(/\D/g, '');
export const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hola,%20necesito%20ayuda`;
