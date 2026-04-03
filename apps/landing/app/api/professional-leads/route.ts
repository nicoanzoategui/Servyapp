import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Aquí idealmente guardaríamos en una base de datos o mandaríamos un email al administrador.
        // Como el modelo original de DB Prisma no disponía de 'ProfessionalLead', por el requerimiento de MOCK (o log),
        // lo estampamos aquí como exitoso de forma directa. (En fase real, prisma.professionalLead.create({...}))

        console.log('New professional lead:', data);

        return NextResponse.json({ success: true, message: 'Recibido correctamente' });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
    }
}
