import { ChangeDetectionStrategy, Component, effect, input, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { Supplier, CreateSupplier, UpdateSupplier } from '../../models/supplier.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-supplier-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        ToggleSwitchModule,
        InputNumberModule,
        TextareaModule,
    ],
    templateUrl: './supplier-form.html',
    styleUrl: './supplier-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierForm {
    private readonly fb = inject(FormBuilder);

    readonly supplier = input<Supplier | null>(null);

    readonly form = this.fb.nonNullable.group({
        tax_id: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(20)]),
        business_name: this.fb.nonNullable.control('', [
            Validators.required,
            Validators.maxLength(200),
        ]),
        contact_name: this.fb.control<string | null>(null, [Validators.maxLength(150)]),
        phone: this.fb.control<string | null>(null, [Validators.maxLength(30)]),
        email: this.fb.control<string | null>(null, [Validators.email, Validators.maxLength(255)]),
        address: this.fb.control<string | null>(null, [Validators.maxLength(300)]),
        credit_days: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
        credit_limit: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
        is_active: this.fb.nonNullable.control(true),
    });

    readonly validationMessages = {
        tax_id: {
            required: 'El NIT es obligatorio.',
            maxlength: 'El NIT no puede superar los 20 caracteres.',
        },
        business_name: {
            required: 'La razón social es obligatoria.',
            maxlength: 'La razón social no puede superar los 200 caracteres.',
        },
        contact_name: {
            maxlength: 'El nombre de contacto no puede superar los 150 caracteres.',
        },
        phone: {
            maxlength: 'El teléfono no puede superar los 30 caracteres.',
        },
        email: {
            email: 'El correo electrónico no es válido.',
            maxlength: 'El correo electrónico no puede superar los 255 caracteres.',
        },
        address: {
            maxlength: 'La dirección no puede superar los 300 caracteres.',
        },
        credit_days: {
            required: 'Los días de crédito son obligatorios.',
            min: 'Los días de crédito no pueden ser negativos.',
        },
        credit_limit: {
            required: 'El límite de crédito es obligatorio.',
            min: 'El límite de crédito no puede ser negativo.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.supplier());
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    resetForm(supplier: Supplier | null): void {
        this.form.reset({
            tax_id: supplier?.tax_id ?? '',
            business_name: supplier?.business_name ?? '',
            contact_name: supplier?.contact_name ?? null,
            phone: supplier?.phone ?? null,
            email: supplier?.email ?? null,
            address: supplier?.address ?? null,
            credit_days: supplier?.credit_days ?? 0,
            credit_limit: supplier?.credit_limit ?? 0,
            is_active: supplier?.is_active ?? true,
        });
    }

    getPayload(): CreateSupplier | UpdateSupplier | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateSupplier = {
            tax_id: value.tax_id,
            business_name: value.business_name,
            contact_name: value.contact_name,
            phone: value.phone,
            email: value.email,
            address: value.address,
            credit_days: value.credit_days,
            credit_limit: value.credit_limit,
            is_active: value.is_active,
        };

        if (this.supplier()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
