import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: 'sans-serif',
                        lineHeight: 1,
                        marginTop: -2,
                    }}
                >
                    s
                </span>
            </div>
        ),
        { ...size }
    );
}
