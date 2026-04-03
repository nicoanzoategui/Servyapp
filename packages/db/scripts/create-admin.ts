/**
 * Alta de administrador en producción o local (contraseña con bcrypt).
 *
 * Uso (recomendado, no queda la clave en el historial del shell):
 *   cd packages/db
 *   ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD='clave_larga_y_unica' ADMIN_NAME='Tu nombre' pnpm create-admin
 *
 * O por argumentos:
 *   pnpm create-admin -- tu@email.com 'clave_larga_y_unica' 'Tu nombre'
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const fromEnv = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD;
    let email: string;
    let password: string;
    let name: string;

    if (fromEnv) {
        email = process.env.ADMIN_EMAIL!.trim();
        password = process.env.ADMIN_PASSWORD!;
        name = (process.env.ADMIN_NAME || 'Administrador').trim();
    } else {
        const [, , a, b, c] = process.argv;
        if (!a || !b) {
            console.error(`
Faltan datos.

  ADMIN_EMAIL=... ADMIN_PASSWORD='...' ADMIN_NAME='...' pnpm create-admin

  o:

  pnpm create-admin -- email@dominio.com 'contraseña' 'Nombre'
`);
            process.exit(1);
        }
        email = a.trim();
        password = b;
        name = (c || 'Administrador').trim();
    }

    if (password.length < 12) {
        console.error('La contraseña debe tener al menos 12 caracteres.');
        process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, 12);

    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
        await prisma.admin.update({
            where: { email },
            data: { password_hash, name },
        });
        console.log(`Admin actualizado: ${email} (misma cuenta, nueva contraseña y nombre).`);
    } else {
        await prisma.admin.create({
            data: { email, password_hash, name },
        });
        console.log(`Admin creado: ${email}`);
    }

    console.log('Listo. Podés iniciar sesión en el backoffice con ese email y contraseña.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
