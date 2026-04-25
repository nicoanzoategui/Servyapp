import { PrismaClient } from '@servy/db';
import { ConversationService } from '../services/conversation.service';
import redis from '../lib/redis';

const prisma = new PrismaClient();

async function testDiagnosticFlow() {
  console.log('🧪 Iniciando test del flujo diagnóstico...\n');
  
  const testPhone = '5491115000001'; // Usuario de prueba del seed
  
  try {
    // Limpiar sesión previa (Prisma + Redis)
    await prisma.whatsappSession.deleteMany({
      where: { phone: testPhone }
    });
    await redis.del(`session:${testPhone}`);
    console.log('✅ Sesión limpiada\n');
    
    // Helper para ver el estado actual
    async function checkState(stepName: string) {
      const session = await prisma.whatsappSession.findUnique({
        where: { phone: testPhone }
      });
      console.log(`   Estado después de ${stepName}: ${session?.step || 'N/A'}`);
      if (session?.data_json) {
        const data = session.data_json as any;
        if (data.category) console.log(`   Categoría: ${data.category}`);
        if (data.serviceType) console.log(`   Tipo: ${data.serviceType}`);
        if (data.scheduledTime) console.log(`   Hora: ${data.scheduledTime}`);
      }
      console.log('');
      return session;
    }
    
    // PASO 1: Describir problema (más específico para Gemini)
    console.log('📱 PASO 1: Usuario describe problema de plomería');
    await ConversationService.processMessage(
      testPhone,
      'text',
      'Tengo una canilla rota en el baño que está perdiendo agua constantemente, necesito un plomero urgente'
    );
    await checkState('descripción problema');
    
    // PASO 2: Verificar que clasificó como Plomería
    let session = await prisma.whatsappSession.findUnique({
      where: { phone: testPhone }
    });
    
    if (session?.step !== 'AWAITING_PHOTOS') {
      console.log('❌ Gemini no clasificó el problema correctamente');
      console.log('   Estado actual:', session?.step);
      return;
    }
    
    // PASO 2: No enviar fotos (opción 2)
    console.log('📱 PASO 2: Usuario elige no enviar fotos');
    await ConversationService.processMessage(testPhone, 'text', '2');
    await checkState('sin fotos');
    
    // PASO 3: Elegir "mañana"
    console.log('📱 PASO 3: Usuario elige mañana');
    await ConversationService.processMessage(testPhone, 'text', '2');
    await checkState('fecha seleccionada');
    
    // PASO 4: Elegir hora 14:00
    console.log('📱 PASO 4: Usuario elige 14:00');
    await ConversationService.processMessage(testPhone, 'text', '14:00');
    await checkState('hora seleccionada');
    
    // PASO 5: Confirmar
    console.log('📱 PASO 5: Usuario confirma fecha/hora');
    await ConversationService.processMessage(testPhone, 'text', '1');
    
    // Esperar a que se procese todo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar ServiceRequest creado
    const request = await prisma.serviceRequest.findFirst({
      where: { 
        user: { phone: testPhone }
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        category: true,
        service_type: true,
        phase: true,
        visit_price: true,
        visit_status: true,
        scheduled_date: true,
        scheduled_time: true,
        is_flexible: true,
        status: true,
        description: true,
        address: true,
      }
    });
    
    console.log('\n📊 RESULTADO DEL TEST:');
    console.log('═'.repeat(50));
    
    if (request) {
      console.log('✅ ServiceRequest creado correctamente!\n');
      console.log('Detalles del request:');
      console.log(`   ID: ${request.id}`);
      console.log(`   Categoría: ${request.category}`);
      console.log(`   Descripción: ${request.description?.substring(0, 50)}...`);
      console.log(`   Tipo: ${request.service_type}`);
      console.log(`   Fase: ${request.phase}`);
      console.log(`   Precio visita: $${request.visit_price}`);
      console.log(`   Estado pago: ${request.visit_status}`);
      console.log(`   Fecha: ${request.scheduled_date?.toLocaleDateString('es-AR')}`);
      console.log(`   Hora: ${request.scheduled_time}`);
      console.log(`   Flexible: ${request.is_flexible}`);
      console.log(`   Status general: ${request.status}`);
      console.log(`   Dirección: ${request.address || 'N/A'}`);
      
      // Verificar valores esperados
      const errors: string[] = [];
      if (request.service_type !== 'diagnostic') {
        errors.push(`❌ service_type es "${request.service_type}", debería ser "diagnostic"`);
      }
      if (request.phase !== 'visit_pending') {
        errors.push(`❌ phase es "${request.phase}", debería ser "visit_pending"`);
      }
      if (Number(request.visit_price) !== 35000) {
        errors.push(`❌ visit_price es ${request.visit_price}, debería ser 35000`);
      }
      if (request.visit_status !== 'pending') {
        errors.push(`❌ visit_status es "${request.visit_status}", debería ser "pending"`);
      }
      if (!request.scheduled_time) {
        errors.push('❌ scheduled_time está vacío');
      }
      if (!request.scheduled_date) {
        errors.push('❌ scheduled_date está vacío');
      }
      
      if (errors.length > 0) {
        console.log('\n⚠️  VALIDACIONES FALLIDAS:');
        errors.forEach(err => console.log(`   ${err}`));
      } else {
        console.log('\n✅ TODAS LAS VALIDACIONES PASARON!');
        console.log('   El flujo diagnóstico funciona correctamente.');
      }
    } else {
      console.log('❌ ERROR: No se creó ningún ServiceRequest');
      console.log('\nRevisando última sesión:');
      const lastSession = await prisma.whatsappSession.findUnique({
        where: { phone: testPhone }
      });
      if (lastSession) {
        console.log(`   Estado final: ${lastSession.step}`);
        console.log(`   Data:`, JSON.stringify(lastSession.data_json, null, 2));
      } else {
        console.log('   No hay sesión activa');
      }
    }
    
    console.log('═'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL TEST:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await redis.quit();
    await prisma.$disconnect();
    console.log('\n🔌 Conexiones cerradas');
  }
}

// Ejecutar
testDiagnosticFlow()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test falló:', error);
    process.exit(1);
  });
