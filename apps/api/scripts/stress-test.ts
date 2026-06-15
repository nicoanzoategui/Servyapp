import autocannon from 'autocannon';

async function runStressTest() {
    const url = process.env.API_PUBLIC_URL || 'http://localhost:3000';
    console.log(`🚀 Iniciando pruebas de estrés contra: ${url}`);

    // Escenario 1: /health (Línea base)
    console.log('\n--- Escenario 1: /health (GET) ---');
    const resHealth = await autocannon({
        url: `${url}/health`,
        connections: 100,
        pipelining: 10,
        duration: 10,
    });
    console.log(autocannon.format(resHealth));

    // Escenario 2: /auth/professional/login (POST con DB load)
    console.log('\n--- Escenario 2: /auth/professional/login (POST) ---');
    const resLogin = await autocannon({
        url: `${url}/auth/professional/login`,
        connections: 50,
        duration: 10,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: 'incorrectpassword',
        }),
    });
    console.log(autocannon.format(resLogin));

    // Escenario 3: /webhook/twilio (POST webhook)
    console.log('\n--- Escenario 3: /webhook/twilio (POST) ---');
    const resWebhook = await autocannon({
        url: `${url}/webhook/twilio`,
        connections: 50,
        duration: 10,
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'From=whatsapp%3A%2B5491115000001&Body=Hola&MessageSid=SMstress123',
    });
    console.log(autocannon.format(resWebhook));
}

runStressTest().catch(console.error);
