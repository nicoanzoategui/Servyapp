import 'dotenv/config';
import {
    SCENARIO_DEFINITIONS,
    DEFAULT_SIM_USER_PHONE,
    DEFAULT_SIM_PRO_PHONE,
    normalizePhone,
    toWhatsappFrom,
    type ScenarioStep,
} from '../tests/fixtures/test-data';

function baseApiUrl(): string {
    return (
        process.env.API_URL?.replace(/\/$/, '') ||
        process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
        'http://localhost:3000'
    );
}

function parseArgs(argv: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const a of argv) {
        if (a === '--list') out.list = 'true';
        else if (a.startsWith('--phone=')) out.phone = a.slice('--phone='.length);
        else if (a.startsWith('--scenario=')) out.scenario = a.slice('--scenario='.length);
        else if (a.startsWith('--category=')) out.category = a.slice('--category='.length);
        else if (a.startsWith('--message=')) out.message = a.slice('--message='.length);
        else if (a.startsWith('--role=')) out.role = a.slice('--role='.length);
    }
    return out;
}

function categoryFirstMessage(category: string): string {
    const m: Record<string, string> = {
        plomeria: 'necesito un plomero',
        electricidad: 'necesito un electricista',
        gas: 'necesito un gasista',
        cerrajeria: 'necesito un cerrajero',
        aires: 'necesito técnico de aire acondicionado',
    };
    return m[category] ?? `necesito servicio de ${category}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function sendTwilioMessage(phoneRaw: string, body: string): Promise<void> {
    const base = baseApiUrl();
    const from = toWhatsappFrom(phoneRaw);
    const params = new URLSearchParams({
        From: from,
        To: 'whatsapp:+10000000000',
        Body: body,
        MessageType: 'text',
        NumMedia: '0',
    });

    const res = await fetch(`${base}/webhook/twilio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!res.ok) {
        console.warn(`[simulate] POST /webhook/twilio → ${res.status} ${res.statusText}`);
    }
}

function resolveScenarioPhone(
    step: ScenarioStep,
    defaultUser: string,
    defaultPro: string,
): { phone: string; message: string; delay: number } {
    if ('phone' in step && (step.phone === 'user' || step.phone === 'professional')) {
        const phone = step.phone === 'user' ? defaultUser : defaultPro;
        return { phone, message: step.message, delay: step.delay };
    }
    return {
        phone: defaultUser,
        message: (step as { message: string }).message,
        delay: (step as { delay: number }).delay,
    };
}

function listScenarios(): void {
    console.log('Escenarios (--scenario=<nombre>):');
    for (const name of Object.keys(SCENARIO_DEFINITIONS)) {
        const def = SCENARIO_DEFINITIONS[name];
        const n = Array.isArray(def) ? def.length : 0;
        console.log(`  ${name} (${n} pasos)`);
    }
    console.log('\nTambién: --phone=... --message="..." [--role=professional|user]');
    console.log('API: API_URL o API_PUBLIC_URL (default http://localhost:3000)');
    console.log(
        '\nNota: /webhook/whatsapp del spec usa JSON de Meta; esta API procesa mensajes vía /webhook/twilio.',
    );
    console.log(
        'El pago MP del flujo completo requiere un pago real en MP (getPayment); este script no lo simula solo.',
    );
}

async function runScenario(
    name: string,
    phoneArg: string | undefined,
    category: string,
): Promise<void> {
    const raw = SCENARIO_DEFINITIONS[name];
    if (!raw || typeof raw === 'string' || !Array.isArray(raw)) {
        console.error(`Escenario desconocido: ${name}`);
        process.exit(1);
    }

    const steps: ScenarioStep[] = [...raw];
    const defaultUser = normalizePhone(phoneArg || DEFAULT_SIM_USER_PHONE);
    const defaultPro = normalizePhone(DEFAULT_SIM_PRO_PHONE);

    if (name === 'full_flow' && steps[0] && !('phone' in steps[0])) {
        const d = (steps[0] as { delay: number }).delay;
        steps[0] = { message: categoryFirstMessage(category), delay: d };
    }

    console.log(`Simulando "${name}" → ${baseApiUrl()} (usuario ${defaultUser})`);

    for (const step of steps) {
        const { phone, message, delay } = resolveScenarioPhone(step, defaultUser, defaultPro);
        await sendTwilioMessage(phone, message);
        console.log(`  → [${phone}] ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`);
        await sleep(delay);
    }
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));

    if (args.list) {
        listScenarios();
        return;
    }

    if (args.message) {
        const role = args.role === 'professional' ? 'professional' : 'user';
        const phoneRaw =
            args.phone ||
            (role === 'professional' ? DEFAULT_SIM_PRO_PHONE : DEFAULT_SIM_USER_PHONE);
        const body = args.message;
        console.log(`Mensaje único (${role}) ${normalizePhone(phoneRaw)}: ${body}`);
        await sendTwilioMessage(phoneRaw, body);
        return;
    }

    if (!args.scenario) {
        console.error('Uso: --scenario=<nombre> | --message="..." [--phone=] [--role=] | --list');
        process.exit(1);
    }

    const category = args.category || 'plomeria';
    await runScenario(args.scenario, args.phone, category);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
