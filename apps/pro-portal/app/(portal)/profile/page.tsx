'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const DAY_ROWS: { key: DayKey; label: string }[] = [
    { key: 'mon', label: 'Lunes' },
    { key: 'tue', label: 'Martes' },
    { key: 'wed', label: 'Miércoles' },
    { key: 'thu', label: 'Jueves' },
    { key: 'fri', label: 'Viernes' },
    { key: 'sat', label: 'Sábado' },
    { key: 'sun', label: 'Domingo' },
];

type DayBand = { enabled: boolean; from: string; to: string };
type ScheduleJson = Record<DayKey, DayBand>;

function defaultSchedule(): ScheduleJson {
    const workday = { enabled: true, from: '09:00', to: '18:00' };
    const off = { enabled: false, from: '09:00', to: '13:00' };
    return {
        mon: { ...workday },
        tue: { ...workday },
        wed: { ...workday },
        thu: { ...workday },
        fri: { ...workday },
        sat: { ...off },
        sun: { ...off },
    };
}

function parseScheduleJson(raw: unknown): ScheduleJson {
    const def = defaultSchedule();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
    const o = raw as Record<string, unknown>;
    (Object.keys(def) as DayKey[]).forEach((key) => {
        const row = o[key];
        if (row && typeof row === 'object' && !Array.isArray(row)) {
            const r = row as Record<string, unknown>;
            def[key] = {
                enabled: typeof r.enabled === 'boolean' ? r.enabled : def[key].enabled,
                from: typeof r.from === 'string' ? r.from.slice(0, 5) : def[key].from,
                to: typeof r.to === 'string' ? r.to.slice(0, 5) : def[key].to,
            };
        }
    });
    return def;
}

const PAYOUT_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Seleccioná…' },
    { value: 'cbu', label: 'CBU' },
    { value: 'cvu', label: 'CVU' },
    { value: 'alias', label: 'Alias bancario' },
    { value: 'mercadopago', label: 'Mercado Pago' },
    { value: 'wallet_other', label: 'Otra billetera virtual' },
];

type SectionId = 'personal' | 'work' | 'address' | 'profile' | 'billing';

export default function ProfilePage() {
    const [loadError, setLoadError] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingSection, setSavingSection] = useState<SectionId | null>(null);
    const [savedFlash, setSavedFlash] = useState<SectionId | null>(null);

    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dni, setDni] = useState('');
    const [emailRo, setEmailRo] = useState('');
    const [phoneRo, setPhoneRo] = useState('');

    const [zonesStr, setZonesStr] = useState('');
    const [categoriesStr, setCategoriesStr] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isScheduled, setIsScheduled] = useState(true);
    const [afterHours, setAfterHours] = useState(false);
    const [schedule, setSchedule] = useState<ScheduleJson>(() => defaultSchedule());

    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');

    const [bio, setBio] = useState('');
    const [skillsStr, setSkillsStr] = useState('');

    const [cbuAlias, setCbuAlias] = useState('');
    const [mpAlias, setMpAlias] = useState('');
    const [payoutInstitution, setPayoutInstitution] = useState('');
    const [payoutAccountType, setPayoutAccountType] = useState('');
    const [taxId, setTaxId] = useState('');

    const loadProfile = useCallback(async () => {
        setLoadError('');
        setLoadingProfile(true);
        try {
            const token = Cookies.get('token');
            if (!token) {
                setLoadError('No hay sesión');
                return;
            }
            const res = await fetch(`${API_URL}/professional/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLoadError(json.error?.message || 'No se pudo cargar el perfil');
                return;
            }
            const d = json.data;
            setName(d.name || '');
            setLastName(d.last_name || '');
            setDni(d.dni || '');
            setEmailRo(d.email || '');
            setPhoneRo(d.phone || '');
            setZonesStr(Array.isArray(d.zones) ? d.zones.join(', ') : '');
            setCategoriesStr(Array.isArray(d.categories) ? d.categories.join(', ') : '');
            setIsUrgent(!!d.is_urgent);
            setIsScheduled(d.is_scheduled !== false);
            setAfterHours(!!d.after_hours_available);
            setSchedule(parseScheduleJson(d.schedule_json));
            setAddress(d.address || '');
            setPostalCode(d.postal_code || '');
            setBio(d.bio || '');
            setSkillsStr(Array.isArray(d.skills) ? d.skills.join(', ') : '');
            setCbuAlias(d.cbu_alias || '');
            setMpAlias(d.mp_alias || '');
            setPayoutInstitution(d.payout_institution || '');
            setPayoutAccountType(d.payout_account_type || '');
            setTaxId(d.tax_id || '');
        } catch {
            setLoadError('Error de red');
        } finally {
            setLoadingProfile(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const buildBody = () => ({
        name: name.trim(),
        last_name: lastName.trim(),
        dni: dni.trim() || null,
        zones: zonesStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        categories: categoriesStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        is_urgent: isUrgent,
        is_scheduled: isScheduled,
        after_hours_available: afterHours,
        schedule_json: schedule,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        bio: bio.trim() || null,
        skills: skillsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        cbu_alias: cbuAlias.trim() || null,
        mp_alias: mpAlias.trim() || null,
        payout_institution: payoutInstitution.trim() || null,
        payout_account_type: payoutAccountType.trim().toLowerCase() || null,
        tax_id: taxId.replace(/\D/g, '') || null,
    });

    const persist = async (section: SectionId) => {
        setSavingSection(section);
        setSavedFlash(null);
        try {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildBody()),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLoadError(json.error?.message || 'No se pudo guardar');
                return;
            }
            setLoadError('');
            setSavedFlash(section);
            window.setTimeout(() => setSavedFlash(null), 2500);
        } catch {
            setLoadError('Error de red al guardar');
        } finally {
            setSavingSection(null);
        }
    };

    const updateDay = (key: DayKey, patch: Partial<DayBand>) => {
        setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    };

    if (loadingProfile) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500 p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
                Cargando perfil…
            </div>
        );
    }

    const sectionCard = (id: SectionId, title: string, subtitle: string, children: ReactNode) => (
        <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {savedFlash === id && (
                        <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                            Guardado
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={savingSection !== null}
                        onClick={() => persist(id)}
                        className="bg-servy-600 hover:bg-servy-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {savingSection === id ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando…
                            </>
                        ) : (
                            'Guardar sección'
                        )}
                    </button>
                </div>
            </div>
            {children}
        </section>
    );

    return (
        <div className="p-6 flex flex-col gap-8 w-full pb-24 md:pb-10 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
                <p className="text-slate-600 text-sm mt-2">
                    Completá cada bloque y guardalo con el botón de la sección. Podés editar varias veces.
                </p>
            </div>

            {loadError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200 font-medium">{loadError}</div>
            )}

            {sectionCard(
                'personal',
                'Datos personales',
                'Nombre y documento. El email y el teléfono los usamos para la cuenta; si necesitás cambiarlos, contactá soporte.',
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
                            <input
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label>
                            <input
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">DNI (solo números)</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500 max-w-md"
                            value={dni}
                            onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="12345678"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-2">Email</label>
                            <p className="text-slate-800 text-sm font-medium break-all">{emailRo || '—'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-2">Teléfono</label>
                            <p className="text-slate-800 text-sm font-medium">{phoneRo || '—'}</p>
                        </div>
                    </div>
                </>
            )}

            {sectionCard(
                'work',
                'Trabajo y disponibilidad',
                'Zonas donde ofrecés servicio, categorías y franjas horarias. Indicá si tomás urgencias o trabajos fuera de horario.',
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Zonas de trabajo (separadas por coma)</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={zonesStr}
                            onChange={(e) => setZonesStr(e.target.value)}
                            placeholder="CABA, Olivos, 1629, GBA Norte"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Categorías (separadas por coma)</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={categoriesStr}
                            onChange={(e) => setCategoriesStr(e.target.value)}
                            placeholder="Plomería, Electricidad"
                        />
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:ring-servy-500"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-slate-800">Apto para emergencias / urgencias</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:ring-servy-500"
                                checked={isScheduled}
                                onChange={(e) => setIsScheduled(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-slate-800">Trabajos programados (turnos)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:ring-servy-500"
                                checked={afterHours}
                                onChange={(e) => setAfterHours(e.target.checked)}
                            />
                            <span className="text-sm font-medium text-slate-800">Disponible fuera de horario habitual</span>
                        </label>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-3">Franjas por día</p>
                        <div className="space-y-2">
                            {DAY_ROWS.map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                                >
                                    <label className="flex items-center gap-2 w-36 shrink-0 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-servy-600"
                                            checked={schedule[key].enabled}
                                            onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-slate-800">{label}</span>
                                    </label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-slate-500">De</span>
                                        <input
                                            type="time"
                                            disabled={!schedule[key].enabled}
                                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                                            value={schedule[key].from}
                                            onChange={(e) => updateDay(key, { from: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-500">a</span>
                                        <input
                                            type="time"
                                            disabled={!schedule[key].enabled}
                                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                                            value={schedule[key].to}
                                            onChange={(e) => updateDay(key, { to: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {sectionCard(
                'address',
                'Dirección',
                'Referencia de ubicación o base operativa (no reemplaza las zonas de cobertura).',
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Calle, número, piso/depto"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Código postal</label>
                        <input
                            className="w-full max-w-xs px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="Ej. 1414"
                        />
                    </div>
                </>
            )}

            {sectionCard(
                'profile',
                'Perfil público',
                'Contá qué hacés y sumá skills concretas (separadas por coma).',
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                        <textarea
                            className="w-full min-h-[120px] px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500 resize-y"
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, 2000))}
                            placeholder="Experiencia, especialidades, tipo de trabajos que preferís…"
                            maxLength={2000}
                        />
                        <p className="text-xs text-slate-400 mt-1">{bio.length} / 2000</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Skills (separadas por coma)</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={skillsStr}
                            onChange={(e) => setSkillsStr(e.target.value)}
                            placeholder="Instalación de termotanque, Pérdidas, Grifería FV"
                        />
                    </div>
                </>
            )}

            {sectionCard(
                'billing',
                'Facturación y cobros',
                'Datos para pagos: indicá tipo de cuenta, CBU/CVU o alias, y entidad bancaria o billetera.',
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de cuenta / medio</label>
                        <select
                            className="w-full max-w-md px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500 bg-white"
                            value={payoutAccountType}
                            onChange={(e) => setPayoutAccountType(e.target.value)}
                        >
                            {PAYOUT_OPTIONS.map((o) => (
                                <option key={o.value || 'empty'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Banco o billetera virtual</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={payoutInstitution}
                            onChange={(e) => setPayoutInstitution(e.target.value)}
                            placeholder="Ej. Banco Galicia, Mercado Pago, Ualá…"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CBU / CVU / Alias de cobro</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500 font-mono text-sm"
                            value={cbuAlias}
                            onChange={(e) => setCbuAlias(e.target.value)}
                            placeholder="22 dígitos CBU, CVU o alias"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Alias Mercado Pago (si aplica)</label>
                        <input
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500"
                            value={mpAlias}
                            onChange={(e) => setMpAlias(e.target.value)}
                            placeholder="Solo si cobrás principalmente por MP"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CUIT / CUIL (opcional, 11 dígitos)</label>
                        <input
                            className="w-full max-w-md px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-servy-500 font-mono text-sm"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="Sin guiones"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
