import { ChangeDetectionStrategy, Component, effect, input, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { Category, CreateCategory, UpdateCategory } from '../../models/category.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-category-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        PasswordModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './category-form.html',
    styleUrl: './category-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm {
    private readonly fb = inject(FormBuilder);

    readonly category = input<Category | null>(null);

    readonly form = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(100)]],
        description: ['', [Validators.maxLength(255)]],
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
    };

    constructor() {
        effect(() => {
            this.resetForm(this.category());
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    resetForm(category: Category | null): void {
        this.form.reset({
            name: category?.name ?? '',
            code: category?.code ?? '',
            description: category?.description ?? '',
            is_active: category?.is_active ?? true,
        });
    }

    getPayload(): CreateCategory | UpdateCategory | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateCategory = {
            code: value.code,
            name: value.name,
            description: value.description,
            is_active: value.is_active,
        };

        if (this.category()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
