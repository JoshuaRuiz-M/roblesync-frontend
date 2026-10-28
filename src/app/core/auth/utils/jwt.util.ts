interface JwtPayload {
    exp?: number;
}

export function getTokenExpiration(token: string): number | null {
    try {
        const payloadPart = token.split('.')[1];

        if (!payloadPart) {
            return null;
        }

        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64)) as JwtPayload;

        if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
            return null;
        }

        return payload.exp * 1000;
    } catch {
        return null;
    }
}

export function isTokenExpired(token: string): boolean {
    const expiration = getTokenExpiration(token);

    return expiration === null || Date.now() >= expiration;
}
