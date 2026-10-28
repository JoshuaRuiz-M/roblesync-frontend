import type { AuthProfile } from './auth-profile.model';

export interface LoginResult {
    access_token: string;
    token_type: 'Bearer';
    user: AuthProfile;
}
