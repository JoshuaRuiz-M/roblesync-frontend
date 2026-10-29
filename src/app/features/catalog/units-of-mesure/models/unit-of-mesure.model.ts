export interface UnitOfMeasure {
    unit_of_measure_id: number;
    code: string;
    name: string;
    abbreviation: string;
    description: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    created_by: number;
    updated_by: number | null;
}

export interface CreateUnitOfMeasure {
    code: string;
    name: string;
    abbreviation: string;
    description?: string | null;
    is_active?: boolean;
}

export interface UpdateUnitOfMeasure {
    code?: string;
    name?: string;
    abbreviation?: string;
    description?: string | null;
    is_active?: boolean;
}
