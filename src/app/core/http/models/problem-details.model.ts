export interface ValidationError {
    field: string;
    message: string;
}

export interface ProblemDetails {
    requestId: string;
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    errors?: ValidationError[];
}
