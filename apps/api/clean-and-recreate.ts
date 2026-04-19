import { prisma } from '@servy/db';
import bcrypt from 'bcrypt';

async function main() {
    const phone = '5491154142169';
    
    console.log('🧹 Limpiando todo relacionado con', phone);
    
    // 0. Encontrar el profesional
    const prof = await prisma.professional.findUnique({ where: { phone } });
    if (!prof) {
        console.log('⚠️  No existe profesional con ese teléfono');
        return;
    }
    
    // 1. Eliminar job_offers del profesional
    await prisma.jobOffer.deleteMany({ where: { professional_id: prof.id } });
    console.log('✅ Ofertas eliminadas');
    
    // 2. Eliminar quotations del profesional
    await prisma.quotation.deleteMany({ 
        where: { 
            job_offer: { professional_id: prof.id } 
        } 
    });
    console.log('✅ Cotizaciones eliminadas');
    
    // 3. Eliminar schedules
    await prisma.providerSchedule.deleteMany({ where: { provider_id: prof.id } });
    console.log('✅ Horarios eliminados');
    
    // 4. Eliminar documentos
    await prisma.professionalDocument.deleteMany({ where: { professional_id: prof.id } });
    console.log('✅ Documentos eliminados');
    
    // 5. Eliminar sesión profesional
    await prisma.professionalSession.deleteMany({ where: { phone } });
    console.log('✅ Sesión profesional eliminada');
    
    // 6. Eliminar como usuario
    await prisma.user.deleteMany({ where: { phone } });
    console.log('✅ Usuario eliminado');
    
    // 7. Eliminar sesiones de WhatsApp
    await prisma.whatsappSession.deleteMany({ where: { phone } });
    console.log('✅ Sesión WhatsApp eliminada');
    
    // 8. Ahora sí eliminar profesional
    await prisma.professional.delete({ where: { id: prof.id } });
    console.log('✅ Profesional eliminado');
    
    // 9. Crear nuevo profesional limpio con bypass completo
    const password_hash = await bcrypt.hash('temporal123', 10);
    const newProf = await prisma.professional.create({
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
    
    console.log('✅ Profesional recreado:', newProf.id);
    console.log('📧 Email: nico.test@servy.internal');
    console.log('🔑 Password temporal: temporal123');
    console.log('\n🎯 Podés loguearte en portal.servy.lat con esas credenciales');
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
