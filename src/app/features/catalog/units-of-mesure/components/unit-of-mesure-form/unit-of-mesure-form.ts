import { ChangeDetectionStrategy, Component, effect, input, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type {
    UnitOfMeasure,
    CreateUnitOfMeasure,
    UpdateUnitOfMeasure,
} from '../../models/unit-of-mesure.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-unit-of-mesure-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        PasswordModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './unit-of-mesure-form.html',
    styleUrl: './unit-of-mesure-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitOfMeasureForm {
    private readonly fb = inject(FormBuilder);

    readonly unitOfMeasure = input<UnitOfMeasure | null>(null);

    readonly form = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(100)]],
        abbreviation: ['', [Validators.required, Validators.maxLength(10)]],
        description: ['', [Validators.maxLength(255)]],
        is_active: [true],
    });

    readonly validationMessages = {
        code: {
            required: 'Code is required.',
            maxlength: 'Code must not exceed 50 characters.',
        },
        name: {
            required: 'Name is required.',
            maxlength: 'Name must not exceed 100 characters.',
        },
        abbreviation: {
            required: 'Abbreviation is required.',
            maxlength: 'Abbreviation must not exceed 10 characters.',
        },
        description: {
            maxlength: 'Description must not exceed 255 characters.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.unitOfMeasure());
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    resetForm(unitOfMeasure: UnitOfMeasure | null): void {
        this.form.reset({
            name: unitOfMeasure?.name ?? '',
            code: unitOfMeasure?.code ?? '',
            abbreviation: unitOfMeasure?.abbreviation ?? '',
            description: unitOfMeasure?.description ?? '',
            is_active: unitOfMeasure?.is_active ?? true,
        });
    }

    getPayload(): CreateUnitOfMeasure | UpdateUnitOfMeasure | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateUnitOfMeasure = {
            code: value.code,
            name: value.name,
            description: value.description,
            is_active: value.is_active,
        };

        if (this.unitOfMeasure()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
