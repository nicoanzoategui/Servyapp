import { ImageResponse } from 'next/og';

export const alt = 'servy.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#0D4638',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span
                    style={{
                        color: '#A7E23C',
                        fontSize: 128,
                        fontWeight: 700,
                        fontFamily: 'sans-serif',
                        letterSpacing: '-0.05em',
                    }}
                >
                    servy.
                </span>
            </div>
        ),
        { ...size }
    );
}
