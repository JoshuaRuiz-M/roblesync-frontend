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
    SaleTarget,
    CreateSalesTarget,
    UpdateSalesTarget,
} from '../../models/sales-targets.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { Saleperson } from '../../../salespersons/models/salesperson.model';

interface SalepersonOption {
    value: number;
}

@Component({
    selector: 'app-sales-targets-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
    ],
    templateUrl: './sales-targets-form.html',
    styleUrl: './sales-targets-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesTargetsForm {
    private readonly fb = inject(FormBuilder);

    readonly salesTarget = input<SaleTarget | null>(null);
    readonly salepersonItems = input<Saleperson[]>([]);

    readonly formChange = output<boolean>();

    readonly salepersonOptions = computed<SalepersonOption[]>(() => {
        const items = this.salepersonItems();

        return items.map((item) => ({
            value: item.salesperson_id,
            label: item.employee_code,
        }));
    });

    readonly form = this.fb.nonNullable.group({
        salesperson_id: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        target_year: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        target_month: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
        target_amount: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
    });

    readonly validationMessages = {
        salesperson_id: {
            required: 'El vendedor es obligatorio.',
        },
        target_year: {
            required: 'El año objetivo es obligatorio.',
        },
        target_month: {
            required: 'El mes objetivo es obligatorio.',
        },
        target_amount: {
            required: 'El monto objetivo es obligatorio.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.salesTarget());
        });
    }

    resetForm(salesTarget: SaleTarget | null): void {
        this.form.reset({
            salesperson_id: salesTarget?.salesperson_id ?? null,
            target_year: salesTarget?.target_year ?? null,
            target_month: salesTarget?.target_month ?? null,
            target_amount: salesTarget?.target_amount ?? null,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateSalesTarget | UpdateSalesTarget | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateSalesTarget = {
            salesperson_id: value.salesperson_id ?? undefined,
            target_year: value.target_year ?? undefined,
            target_month: value.target_month ?? undefined,
            target_amount: value.target_amount ?? undefined,
        };

        if (this.salesTarget()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
