/** Panel lateral de auth. CSS background (no next/image) para no reventar Vercel con PNGs de 8MB. */
export default function AuthHero() {
    return (
        <div className="hidden lg:block flex-1 relative bg-gradient-to-br from-servy-900 via-servy-800 to-servy-950">
            <div
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{ backgroundImage: "url('/images/login-hero.png')" }}
            />
            <div className="absolute inset-0 bg-servy-900/40" />
            <div className="absolute bottom-12 left-12 right-12">
                <p className="text-white text-3xl font-bold leading-snug">
                    Más trabajo.
                    <br />
                    Cobro garantizado.
                    <br />
                    Sin complicaciones.
                </p>
            </div>
        </div>
    );
}
