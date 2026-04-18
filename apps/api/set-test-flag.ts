import { prisma } from '@servy/db';

async function main() {
    const phone = '5491154142169'; // Tu teléfono
    
    // Agregar flag para recibir todas las ofertas
    await prisma.professional.update({
        where: { phone },
        data: {
            // Agregar todas las categorías
            categories: ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'],
            // Agregar zona amplia
            zones: ['CABA', 'GBA Norte', 'GBA Sur', 'GBA Oeste', 'La Plata', 'Zona Norte', 'Zona Sur']
        }
    });
    
    console.log('✅ Tu usuario ahora recibe TODAS las ofertas (todas categorías + todas zonas)');
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
