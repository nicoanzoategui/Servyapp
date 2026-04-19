import { prisma } from '@servy/db';
import bcrypt from 'bcrypt';

async function main() {
    const phone = '5491154142169';
    
    // Crear profesional limpio con bypass completo
    const password_hash = await bcrypt.hash('temporal123', 10);
    const prof = await prisma.professional.create({
        data: {
            phone,
            name: 'Nicolas',
            last_name: 'Anzoategui',
            email: 'nico.test@servy.internal',
            password_hash,
            status: 'active',
            onboarding_completed: true,
            categories: ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'],
            zones: ['CABA', 'GBA Norte', 'GBA Sur', 'GBA Oeste', 'La Plata', 'Zona Norte', 'Zona Sur'],
            is_urgent: true,
            is_scheduled: true
        }
    });
    
    console.log('✅ Profesional creado:', prof.id);
    console.log('📱 Teléfono:', phone);
    console.log('📧 Email: nico.test@servy.internal');
    console.log('🔑 Password: temporal123');
    console.log('\n🎯 Ya podés:');
    console.log('1. Loguearte en portal.servy.lat');
    console.log('2. Escribir "disponible" al bot para activarte');
    console.log('3. Recibir TODAS las ofertas (bypass completo)');
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
