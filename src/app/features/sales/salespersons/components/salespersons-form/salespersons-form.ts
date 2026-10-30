import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
    inject,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type {
    Saleperson,
    CreateSaleperson,
    UpdateSaleperson,
} from '../../models/salesperson.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';
import { User } from '../../../../users/models/user.model';

interface UserOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-salespersons-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './salespersons-form.html',
    styleUrl: './salespersons-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalespersonsForm {
    private readonly fb = inject(FormBuilder);

    readonly salesperson = input<Saleperson | null>(null);
    readonly userItems = input<User[]>([]);

    readonly formChange = output<boolean>();

    readonly userOptions = computed<UserOption[]>(() => {
        const items = this.userItems();

        return items.map((item) => ({
            label: item.username,
            value: item.user_id,
        }));
    });

    readonly form = this.fb.nonNullable.group({
        user_id: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        employee_code: ['', [Validators.required, Validators.maxLength(30)]],
        phone: ['', [Validators.maxLength(30)]],
        is_active: [true, [Validators.required]],
    });

    readonly validationMessages = {
        user_id: {
            required: 'El usuario es obligatorio.',
        },
        employee_code: {
            required: 'El código de empleado es obligatorio.',
            maxlength: 'El código de empleado no puede superar los 30 caracteres.',
        },
        phone: {
            maxlength: 'El teléfono no puede superar los 30 caracteres.',
        },
        is_active: {
            required: 'El estado es obligatorio.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.salesperson());
        });
    }

    resetForm(salesperson: Saleperson | null): void {
        this.form.reset({
            user_id: salesperson?.user_id ?? null,
            employee_code: salesperson?.employee_code ?? '',
            phone: salesperson?.phone ?? '',
            is_active: salesperson?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateSaleperson | UpdateSaleperson | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateSaleperson = {
            user_id: value.user_id ?? undefined,
            employee_code: value.employee_code,
            phone: value.phone,
            is_active: value.is_active,
        };

        if (this.salesperson()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
