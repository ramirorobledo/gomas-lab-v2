import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Leer cookie existente
    let sessionId = request.cookies.get('gomas_session')?.value;

    // Si no existe, generar una nueva
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        response.cookies.set('gomas_session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 días
        });
    }

    // Agregar session ID a headers (para que los routes puedan acceder)
    response.headers.set('X-Session-ID', sessionId);

    return response;
}

export const config = {
    matcher: ['/api/:path*'],
};
