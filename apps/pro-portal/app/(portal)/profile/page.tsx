'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';
import { Loader2, Trash2, ExternalLink } from 'lucide-react';

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

/** Borde continuo (sin ring) para evitar esquinas “cortadas” al enfocar. */
const INPUT_BASE =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition-colors focus:border-servy-600 focus:outline-none focus:ring-0 focus-visible:outline-none disabled:bg-slate-50 disabled:opacity-60';

const INPUT_TIME =
    'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-servy-600 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:bg-slate-50';

type TabId = 'profile' | 'personal' | 'work' | 'billing' | 'documents';

const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Perfil público' },
    { id: 'personal', label: 'Datos personales' },
    { id: 'work', label: 'Trabajo' },
    { id: 'billing', label: 'Facturación' },
    { id: 'documents', label: 'Documentación' },
];

type DocRow = {
    id: string;
    kind: string;
    filename: string | null;
    content_type: string;
    created_at: string;
    url: string;
};

const DOC_KIND_LABEL: Record<string, string> = {
    dni_front: 'DNI frente',
    dni_back: 'DNI dorso',
    certification: 'Certificación',
};

function guessMime(file: File): string {
    if (file.type) return file.type;
    const n = file.name.toLowerCase();
    if (n.endsWith('.pdf')) return 'application/pdf';
    if (n.endsWith('.png')) return 'image/png';
    return 'image/jpeg';
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result as string;
            const i = r.indexOf(',');
            resolve(i >= 0 ? r.slice(i + 1) : r);
        };
        reader.onerror = () => reject(new Error('lectura'));
        reader.readAsDataURL(file);
    });
}

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [loadError, setLoadError] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingTab, setSavingTab] = useState<TabId | null>(null);
    const [savedFlash, setSavedFlash] = useState<TabId | null>(null);

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

    const [docs, setDocs] = useState<DocRow[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docUploading, setDocUploading] = useState<string | null>(null);
    const [docError, setDocError] = useState('');

    const loadDocuments = useCallback(async () => {
        setDocError('');
        setDocsLoading(true);
        try {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/documents`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDocError(json.error?.message || 'No se pudieron cargar los documentos');
                return;
            }
            setDocs(Array.isArray(json.data) ? json.data : []);
        } catch {
            setDocError('Error de red');
        } finally {
            setDocsLoading(false);
        }
    }, []);

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

    useEffect(() => {
        if (activeTab === 'documents') loadDocuments();
    }, [activeTab, loadDocuments]);

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

    const persist = async (tab: TabId) => {
        if (tab === 'documents') return;
        setSavingTab(tab);
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
            setSavedFlash(tab);
            window.setTimeout(() => setSavedFlash(null), 2500);
        } catch {
            setLoadError('Error de red al guardar');
        } finally {
            setSavingTab(null);
        }
    };

    const uploadDoc = async (kind: 'dni_front' | 'dni_back' | 'certification', file: File | null) => {
        if (!file) return;
        const mime = guessMime(file);
        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(mime)) {
            setDocError('Solo JPG, PNG o PDF');
            return;
        }
        setDocError('');
        setDocUploading(kind);
        try {
            const token = Cookies.get('token');

            // Comprimir imágenes antes de enviar
            let content_base64: string;
            if (mime === 'image/jpeg' || mime === 'image/png') {
                // Crear canvas para comprimir
                const img = new Image();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const objectUrl = URL.createObjectURL(file);
                try {
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
                        img.src = objectUrl;
                    });
                } finally {
                    URL.revokeObjectURL(objectUrl);
                }

                // Redimensionar si es muy grande (máx 1920px)
                let width = img.width;
                let height = img.height;
                const maxDimension = 1920;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                // Comprimir a 85% calidad
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const i = compressedDataUrl.indexOf(',');
                content_base64 = i >= 0 ? compressedDataUrl.slice(i + 1) : compressedDataUrl;
            } else {
                // PDF sin comprimir
                content_base64 = await fileToBase64(file);
            }

            const res = await fetch(`${API_URL}/professional/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    kind,
                    filename: file.name,
                    content_type: mime === 'image/png' ? 'image/jpeg' : mime, // Convertir PNG a JPEG
                    content_base64,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDocError(json.error?.message || 'No se pudo subir');
                return;
            }
            await loadDocuments();
        } catch (err) {
            console.error('Upload error:', err);
            setDocError('Error al subir el archivo');
        } finally {
            setDocUploading(null);
        }
    };

    const deleteDoc = async (id: string) => {
        setDocError('');
        try {
            const token = Cookies.get('token');
            const res = await fetch(`${API_URL}/professional/documents/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                setDocError(json.error?.message || 'No se pudo eliminar');
                return;
            }
            await loadDocuments();
        } catch {
            setDocError('Error de red');
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

    const tabFooter = (tab: TabId, children: ReactNode) => (
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-h-[1.5rem]">
                {savedFlash === tab && (
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 inline-block">
                        Guardado
                    </span>
                )}
            </div>
            {children}
        </div>
    );

    const saveButton = (tab: TabId) => (
        <button
            type="button"
            disabled={savingTab !== null}
            onClick={() => persist(tab)}
            className="w-full sm:w-auto bg-servy-600 hover:bg-servy-500 text-white text-sm font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
            {savingTab === tab ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                </>
            ) : (
                'Guardar cambios'
            )}
        </button>
    );

    const tabPanel = (tab: TabId, title: string, subtitle: string, body: ReactNode, showSave = true) => (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-10rem)]">
            <div className="shrink-0 mb-4">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 pr-1 space-y-5">{body}</div>
            {showSave ? tabFooter(tab, saveButton(tab)) : null}
        </div>
    );

    return (
        <div className="p-6 flex flex-col gap-6 w-full pb-24 md:pb-10 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
                <p className="text-slate-600 text-sm mt-2">
                    Navegá por las pestañas. Guardá cada sección con el botón al final del formulario.
                </p>
            </div>

            {loadError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200 font-medium">{loadError}</div>
            )}

            <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200 -mx-1 px-1">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={`shrink-0 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition whitespace-nowrap ${
                            activeTab === t.id
                                ? 'bg-white text-servy-700 border border-b-0 border-slate-200 -mb-px shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'profile' &&
                tabPanel(
                    'profile',
                    'Perfil público',
                    'Contá qué hacés y sumá skills concretas (separadas por coma).',
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                            <textarea
                                className={`${INPUT_BASE} min-h-[120px] resize-y`}
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
                                className={INPUT_BASE}
                                value={skillsStr}
                                onChange={(e) => setSkillsStr(e.target.value)}
                                placeholder="Instalación de termotanque, Pérdidas, Grifería FV"
                            />
                        </div>
                    </>
                )}

            {activeTab === 'personal' &&
                tabPanel(
                    'personal',
                    'Datos personales',
                    'Nombre, documento y domicilio. El email y el teléfono son de la cuenta; para cambiarlos contactá soporte.',
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
                                <input
                                    className={INPUT_BASE}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label>
                                <input
                                    className={INPUT_BASE}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">DNI (solo números)</label>
                            <input
                                className={`${INPUT_BASE} max-w-md`}
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
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <p className="text-sm font-bold text-slate-800">Domicilio</p>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
                                <input
                                    className={INPUT_BASE}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Calle, número, piso/depto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Código postal</label>
                                <input
                                    className={`${INPUT_BASE} max-w-xs`}
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="Ej. 1414"
                                />
                            </div>
                        </div>
                    </>
                )}

            {activeTab === 'work' &&
                tabPanel(
                    'work',
                    'Trabajo y disponibilidad',
                    'Zonas donde ofrecés servicio, categorías y franjas horarias.',
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Zonas de trabajo (separadas por coma)</label>
                            <input
                                className={INPUT_BASE}
                                value={zonesStr}
                                onChange={(e) => setZonesStr(e.target.value)}
                                placeholder="Ej. Pilar, Escobar, CABA, 1629"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Ejemplo: <span className="font-medium text-slate-600">Pilar, Escobar, Olivos</span> — podés mezclar localidades y códigos postales.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Categorías (separadas por coma)</label>
                            <input
                                className={INPUT_BASE}
                                value={categoriesStr}
                                onChange={(e) => setCategoriesStr(e.target.value)}
                                placeholder="Plomería, Electricidad"
                            />
                        </div>
                        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:outline-none focus:ring-2 focus:ring-servy-500/30 focus:ring-offset-0"
                                    checked={isUrgent}
                                    onChange={(e) => setIsUrgent(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-800">Apto para emergencias / urgencias</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:outline-none focus:ring-2 focus:ring-servy-500/30 focus:ring-offset-0"
                                    checked={isScheduled}
                                    onChange={(e) => setIsScheduled(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-800">Trabajos programados (turnos)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:outline-none focus:ring-2 focus:ring-servy-500/30 focus:ring-offset-0"
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
                                                className="h-4 w-4 rounded border-slate-300 text-servy-600 focus:outline-none focus:ring-2 focus:ring-servy-500/30 focus:ring-offset-0"
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
                                                className={`${INPUT_TIME} w-auto`}
                                                value={schedule[key].from}
                                                onChange={(e) => updateDay(key, { from: e.target.value })}
                                            />
                                            <span className="text-xs text-slate-500">a</span>
                                            <input
                                                type="time"
                                                disabled={!schedule[key].enabled}
                                                className={`${INPUT_TIME} w-auto`}
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

            {activeTab === 'billing' &&
                tabPanel(
                    'billing',
                    'Facturación y cobros',
                    'Datos para pagos: tipo de cuenta, CBU/CVU o alias, y entidad bancaria o billetera.',
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de cuenta / medio</label>
                            <select
                                className={`${INPUT_BASE} max-w-md`}
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
                                className={INPUT_BASE}
                                value={payoutInstitution}
                                onChange={(e) => setPayoutInstitution(e.target.value)}
                                placeholder="Ej. Banco Galicia, Mercado Pago, Ualá…"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">CBU / CVU / Alias de cobro</label>
                            <input
                                className={`${INPUT_BASE} font-mono text-sm`}
                                value={cbuAlias}
                                onChange={(e) => setCbuAlias(e.target.value)}
                                placeholder="22 dígitos CBU, CVU o alias"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Alias Mercado Pago (si aplica)</label>
                            <input
                                className={INPUT_BASE}
                                value={mpAlias}
                                onChange={(e) => setMpAlias(e.target.value)}
                                placeholder="Solo si cobrás principalmente por MP"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">CUIT / CUIL (opcional, 11 dígitos)</label>
                            <input
                                className={`${INPUT_BASE} max-w-md font-mono text-sm`}
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="Sin guiones"
                            />
                        </div>
                    </>
                )}

            {activeTab === 'documents' &&
                tabPanel(
                    'documents',
                    'Documentación',
                    'Subí DNI (frente y dorso) y certificaciones en JPG, PNG o PDF. Las certificaciones podés agregar varias.',
                    <>
                        {docError && (
                            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">{docError}</div>
                        )}
                        {docsLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Cargando documentos…
                            </div>
                        ) : (
                            <>
                                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                    <p className="text-sm font-bold text-slate-800">DNI — frente</p>
                                    <p className="text-xs text-slate-500">Un archivo. Si subís otro, reemplaza al anterior.</p>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                                        className="text-sm w-full"
                                        disabled={docUploading !== null}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            e.target.value = '';
                                            void uploadDoc('dni_front', f ?? null);
                                        }}
                                    />
                                    {docUploading === 'dni_front' && (
                                        <p className="text-xs text-servy-600 flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
                                        </p>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                    <p className="text-sm font-bold text-slate-800">DNI — dorso</p>
                                    <p className="text-xs text-slate-500">Un archivo. Si subís otro, reemplaza al anterior.</p>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                                        className="text-sm w-full"
                                        disabled={docUploading !== null}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            e.target.value = '';
                                            void uploadDoc('dni_back', f ?? null);
                                        }}
                                    />
                                    {docUploading === 'dni_back' && (
                                        <p className="text-xs text-servy-600 flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
                                        </p>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                    <p className="text-sm font-bold text-slate-800">Certificaciones (opcional)</p>
                                    <p className="text-xs text-slate-500">Podés subir más de un archivo; cada uno queda como una certificación.</p>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                                        className="text-sm w-full"
                                        disabled={docUploading !== null}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            e.target.value = '';
                                            void uploadDoc('certification', f ?? null);
                                        }}
                                    />
                                    {docUploading === 'certification' && (
                                        <p className="text-xs text-servy-600 flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-slate-800 mb-2">Archivos cargados</p>
                                    {docs.length === 0 ? (
                                        <p className="text-sm text-slate-500">Todavía no hay documentos.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {docs.map((d) => (
                                                <li
                                                    key={d.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                                                >
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-slate-800">{DOC_KIND_LABEL[d.kind] || d.kind}</span>
                                                        {d.filename && (
                                                            <span className="text-slate-600 truncate block max-w-[220px]">{d.filename}</span>
                                                        )}
                                                        <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <a
                                                            href={d.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-lg text-servy-600 hover:bg-servy-50"
                                                            title="Abrir"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => void deleteDoc(d.id)}
                                                            className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </>,
                    false
                )}
        </div>
    );
}
