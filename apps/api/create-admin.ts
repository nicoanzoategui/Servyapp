import { prisma } from '@servy/db';
import bcrypt from 'bcrypt';

async function main() {
    const email = 'nicoanzoateguidg@gmail.com';
    const password = 'MAMArosa288';
    const name = 'Nico Anzoategui';
    
    // Verificar si ya existe
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
        console.log('Admin ya existe con ese email');
        return;
    }
    
    // Hashear password
    const password_hash = await bcrypt.hash(password, 12);
    
    // Crear admin
    const admin = await prisma.admin.create({
        data: {
            email,
            password_hash,
            name,
        },
    });
    
    console.log('✅ Admin creado exitosamente:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
    });
    console.log('\nPodés iniciar sesión en https://admin.servy.lat con:');
    console.log('Email:', email);
    console.log('Password: [la que configuraste]');
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
