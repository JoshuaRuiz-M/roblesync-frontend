export interface User {
    user_id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface CreateUser {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
}

export interface UpdateUser {
    username?: string;
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}

export interface UserRole {
    role_id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
}

export interface SyncUserRoles {
    role_ids: number[];
}
