import { ChangeDetectionStrategy, Component, effect, input, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { Warehouse, CreateWarehouse, UpdateWarehouse } from '../../models/warehouse.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-warehouse-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        PasswordModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './warehouse-form.html',
    styleUrl: './warehouse-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseForm {
    private readonly fb = inject(FormBuilder);

    readonly warehouse = input<Warehouse | null>(null);

    readonly form = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(100)]],
        description: ['', [Validators.maxLength(255)]],
        address: ['', [Validators.maxLength(255)]],
        is_active: [true],
    });

    readonly validationMessages = {
        code: {
            required: 'El código es obligatorio.',
            maxlength: 'El código no puede superar los 50 caracteres.',
        },
        name: {
            required: 'El nombre es obligatorio.',
            maxlength: 'El nombre no puede superar los 100 caracteres.',
        },
        description: {
            maxlength: 'La descripción no puede superar los 255 caracteres.',
        },
        address: {
            maxlength: 'La dirección no puede superar los 255 caracteres.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.warehouse());
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    resetForm(warehouse: Warehouse | null): void {
        this.form.reset({
            name: warehouse?.name ?? '',
            code: warehouse?.code ?? '',
            description: warehouse?.description ?? '',
            address: warehouse?.address ?? '',
            is_active: warehouse?.is_active ?? true,
        });
    }

    getPayload(): CreateWarehouse | UpdateWarehouse | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateWarehouse = {
            code: value.code,
            name: value.name,
            description: value.description,
            is_active: value.is_active,
            address: value.address,
        };

        if (this.warehouse()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
