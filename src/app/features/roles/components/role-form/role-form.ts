import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { Role, CreateRole } from '../../models/role.model';
import { applyServerValidationErrors } from '../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../shared/utils/form-validation.util';

@Component({
    selector: 'app-role-form',
    imports: [ReactiveFormsModule, InputTextModule, TextareaModule, ToggleSwitchModule],
    templateUrl: './role-form.html',
    styleUrl: './role-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleForm {
    private readonly fb = inject(FormBuilder);

    readonly role = input<Role | null>(null);

    readonly form = this.fb.group({
        code: this.fb.nonNullable.control('', [Validators.required]),

        name: this.fb.nonNullable.control('', [Validators.required]),

        description: this.fb.control<string | null>(null),

        is_active: this.fb.nonNullable.control(true),
    });

    readonly validationMessages = {
        code: {
            required: 'El código del rol es obligatorio.',
        },
        name: {
            required: 'El nombre del rol es obligatorio.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.role());
        });
    }

    resetForm(role: Role | null): void {
        this.form.reset({
            code: role?.code ?? '',
            name: role?.name ?? '',
            description: role?.description ?? null,
            is_active: role?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateRole | null {
        const code = this.form.controls.code.value.trim().toUpperCase();

        const name = this.form.controls.name.value.trim();

        this.form.patchValue({
            code,
            name,
        });

        this.form.markAllAsTouched();

        if (!code || !name || this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        return {
            code: value.code,
            name: value.name,
            description: value.description?.trim() || null,
            is_active: value.is_active,
        };
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
