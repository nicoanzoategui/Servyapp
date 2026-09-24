'use client';

export function ProblemPhotos({ photos }: { photos?: string[] | null }) {
    if (!photos || photos.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                        src={url}
                        alt="Foto del problema"
                        className="h-20 w-20 object-cover rounded-lg border border-slate-200 hover:opacity-90"
                    />
                </a>
            ))}
        </div>
    );
}
