'use client';

function cell(v: unknown): string {
    if (v == null) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'sí' : 'no';
    return String(v);
}

export function JsonTable({
    data,
    maxRows = 80,
    className = '',
}: {
    data: unknown;
    maxRows?: number;
    className?: string;
}) {
    if (!Array.isArray(data) || data.length === 0) {
        return <p className="text-slate-500 text-sm">Sin filas.</p>;
    }

    const rows = data.slice(0, maxRows) as Record<string, unknown>[];
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).slice(0, 24);

    return (
        <div className={`overflow-auto rounded-lg border border-slate-200 ${className}`}>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {keys.map((k) => (
                            <th key={k} className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">
                                {k}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80">
                            {keys.map((k) => (
                                <td key={k} className="px-3 py-2 max-w-[220px] truncate" title={cell(r[k])}>
                                    {cell(r[k])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length > maxRows && (
                <p className="text-xs text-slate-400 px-3 py-2">Mostrando {maxRows} de {data.length}</p>
            )}
        </div>
    );
}
