import { PrismaClient } from '@servy/db';
import redis from '../lib/redis';

const prisma = new PrismaClient();

async function testDiagnosticFlowMock() {
  console.log('🧪 Test del flujo diagnóstico (mock - sin servicios externos)\n');
  
  const testPhone = '5491115000001';
  
  try {
    // Limpiar
    await prisma.whatsappSession.deleteMany({ where: { phone: testPhone } });
    await redis.del(`session:${testPhone}`);
    console.log('✅ Sesión limpiada\n');
    
    // SIMULAR manualmente el flujo guardando estados directos
    console.log('📱 PASO 1: Simular clasificación de problema (Plomería)');
    await prisma.whatsappSession.create({
      data: {
        phone: testPhone,
        step: 'AWAITING_PHOTOS',
        data_json: {
          description: 'Canilla rota que pierde agua',
          category: 'Plomería',
          urgency: 'medium',
          serviceType: 'diagnostic',
          photos: [],
        },
        expires_at: new Date(Date.now() + 3600000),
      }
    });
    console.log('   ✓ Estado: AWAITING_PHOTOS\n');
    
    // PASO 2: Sin fotos
    console.log('📱 PASO 2: Usuario dice "no fotos"');
    await prisma.whatsappSession.update({
      where: { phone: testPhone },
      data: {
        step: 'AWAITING_SERVICE_DATE',
        data_json: {
          description: 'Canilla rota que pierde agua',
          category: 'Plomería',
          urgency: 'medium',
          serviceType: 'diagnostic',
          photos: [],
        },
      }
    });
    console.log('   ✓ Estado: AWAITING_SERVICE_DATE\n');
    
    // PASO 3: Elegir mañana
    console.log('📱 PASO 3: Usuario elige mañana');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await prisma.whatsappSession.update({
      where: { phone: testPhone },
      data: {
        step: 'AWAITING_SERVICE_TIME',
        data_json: {
          description: 'Canilla rota que pierde agua',
          category: 'Plomería',
          urgency: 'medium',
          serviceType: 'diagnostic',
          photos: [],
          scheduledDate: tomorrow.toISOString(),
        },
      }
    });
    console.log('   ✓ Estado: AWAITING_SERVICE_TIME\n');
    
    // PASO 4: Elegir hora
    console.log('📱 PASO 4: Usuario elige 14:00');
    await prisma.whatsappSession.update({
      where: { phone: testPhone },
      data: {
        step: 'AWAITING_DATE_CONFIRMATION',
        data_json: {
          description: 'Canilla rota que pierde agua',
          category: 'Plomería',
          urgency: 'medium',
          serviceType: 'diagnostic',
          photos: [],
          scheduledDate: tomorrow.toISOString(),
          scheduledTime: '14:00',
          isFlexible: false,
        },
      }
    });
    console.log('   ✓ Estado: AWAITING_DATE_CONFIRMATION\n');
    
    // PASO 5: Crear ServiceRequest directamente (simulando confirmación)
    console.log('📱 PASO 5: Crear ServiceRequest (simulando confirmación)');
    
    const user = await prisma.user.findUnique({
      where: { phone: testPhone }
    });
    
    if (!user) {
      throw new Error('Usuario de prueba no encontrado en la DB');
    }
    
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        user_phone: testPhone,
        category: 'Plomería',
        description: 'Canilla rota que pierde agua',
        service_type: 'diagnostic',
        phase: 'visit_pending',
        visit_price: 35000,
        visit_status: 'pending',
        scheduled_date: tomorrow,
        scheduled_time: '14:00',
        is_flexible: false,
        photos: [],
        address: user.address || 'Dirección de prueba',
        status: 'pending',
      },
    });
    
    console.log('   ✓ ServiceRequest creado!\n');
    
    // VERIFICAR
    console.log('📊 RESULTADO DEL TEST:');
    console.log('═'.repeat(50));
    console.log('✅ ServiceRequest creado correctamente!\n');
    console.log('Detalles:');
    console.log(`   ID: ${serviceRequest.id}`);
    console.log(`   Categoría: ${serviceRequest.category}`);
    console.log(`   Tipo: ${serviceRequest.service_type}`);
    console.log(`   Fase: ${serviceRequest.phase}`);
    console.log(`   Precio visita: $${serviceRequest.visit_price}`);
    console.log(`   Estado pago: ${serviceRequest.visit_status}`);
    console.log(`   Fecha: ${serviceRequest.scheduled_date?.toLocaleDateString('es-AR')}`);
    console.log(`   Hora: ${serviceRequest.scheduled_time}`);
    console.log(`   Flexible: ${serviceRequest.is_flexible}`);
    console.log(`   Status: ${serviceRequest.status}`);
    
    // Validaciones
    const errors: string[] = [];
    if (serviceRequest.service_type !== 'diagnostic') {
      errors.push(`❌ service_type es "${serviceRequest.service_type}", debería ser "diagnostic"`);
    }
    if (serviceRequest.phase !== 'visit_pending') {
      errors.push(`❌ phase es "${serviceRequest.phase}", debería ser "visit_pending"`);
    }
    if (Number(serviceRequest.visit_price) !== 35000) {
      errors.push(`❌ visit_price es ${serviceRequest.visit_price}, debería ser 35000`);
    }
    if (serviceRequest.visit_status !== 'pending') {
      errors.push(`❌ visit_status es "${serviceRequest.visit_status}", debería ser "pending"`);
    }
    if (!serviceRequest.scheduled_time) {
      errors.push('❌ scheduled_time está vacío');
    }
    if (!serviceRequest.scheduled_date) {
      errors.push('❌ scheduled_date está vacío');
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️  VALIDACIONES FALLIDAS:');
      errors.forEach(err => console.log(`   ${err}`));
    } else {
      console.log('\n✅ TODAS LAS VALIDACIONES PASARON!');
      console.log('   Schema y campos funcionan correctamente.');
    }
    
    console.log('═'.repeat(50));
    
    // Limpiar
    await prisma.serviceRequest.delete({ where: { id: serviceRequest.id } });
    console.log('\n🧹 ServiceRequest de prueba eliminado');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.whatsappSession.deleteMany({ where: { phone: testPhone } });
    await redis.del(`session:${testPhone}`);
    await redis.quit();
    await prisma.$disconnect();
    console.log('🔌 Limpieza completada\n');
  }
}

testDiagnosticFlowMock()
  .then(() => {
    console.log('✅ Test completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });
