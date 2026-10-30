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

import type { Customer, CreateCustomer, UpdateCustomer } from '../../models/customer.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../../shared/utils/form-validation.util';
import { TextareaModule } from 'primeng/textarea';
import { Saleperson } from './../../../salespersons/models/salesperson.model';
import { PriceList } from './../../../price-lists/models/price-list.model';

interface SalepersonOption {
    label: string;
    value: number;
}

interface PriceListOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-customers-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TextareaModule,
    ],
    templateUrl: './customers-form.html',
    styleUrl: './customers-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersForm {
    private readonly fb = inject(FormBuilder);

    readonly customer = input<Customer | null>(null);
    readonly salepersonItems = input<Saleperson[]>([]);
    readonly priceListItems = input<PriceList[]>([]);

    readonly formChange = output<boolean>();

    readonly salepersonOption = computed<SalepersonOption[]>(() => {
        const items = this.salepersonItems();

        return items.map((item) => ({
            label: item.employee_code,
            value: item.salesperson_id,
        }));
    });

    readonly priceListOption = computed<PriceListOption[]>(() => {
        const items = this.priceListItems();
        return items.map((item) => ({
            label: item.name,
            value: item.price_list_id,
        }));
    });

    readonly form = this.fb.nonNullable.group({
        customer_code: ['', [Validators.required, Validators.maxLength(50)]],
        tax_id: ['', [Validators.required, Validators.maxLength(20)]],
        business_name: ['', [Validators.required, Validators.maxLength(200)]],
        customer_type: ['', [Validators.required, Validators.maxLength(20)]],
        contact_name: ['', [Validators.maxLength(150)]],
        phone: ['', [Validators.maxLength(30)]],
        email: ['', [Validators.maxLength(255), Validators.email]],
        address: ['', [Validators.maxLength(300)]],
        salesperson_id: this.fb.control<number | null>(null, Validators.required),
        price_list_id: this.fb.control<number | null>(null, Validators.required),
        credit_days: [0, Validators.required],
        credit_limit: [0, Validators.required],
        is_credit_blocked: [false, Validators.required],
        is_active: [true, Validators.required],
    });

    readonly validationMessages = {
        customer_code: {
            required: 'Codigo de cliente es requerido.',
            maxlength: 'Codigo de cliente no puede exceder 50 caracteres.',
        },
        tax_id: {
            required: 'RUC es requerido.',
            maxlength: 'RUC no puede exceder 20 caracteres.',
        },
        business_name: {
            required: 'Razon social es requerido.',
            maxlength: 'Razon social no puede exceder 200 caracteres.',
        },
        customer_type: {
            required: 'Tipo de cliente es requerido.',
            maxlength: 'Tipo de cliente no puede exceder 20 caracteres.',
        },
        contact_name: {
            maxlength: 'Nombre de contacto no puede exceder 150 caracteres.',
        },
        phone: {
            maxlength: 'Telefono no puede exceder 30 caracteres.',
        },
        email: {
            maxlength: 'Correo electronico no puede exceder 255 caracteres.',
            email: 'Correo electronico debe ser un correo valido.',
        },
        address: {
            maxlength: 'Direccion no puede exceder 300 caracteres.',
        },
        salesperson_id: {
            required: 'Vendedor es requerido.',
        },
        price_list_id: {
            required: 'Lista de precios es requerido.',
        },
        credit_days: {
            required: 'Dias de credito es requerido.',
        },
        credit_limit: {
            required: 'Limite de credito es requerido.',
        },
        is_credit_blocked: {
            required: 'Bloqueo de credito es requerido.',
        },
        is_active: {
            required: 'Activo es requerido.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.customer());
        });
    }

    resetForm(customer: Customer | null): void {
        this.form.reset({
            customer_code: customer?.customer_code ?? '',
            tax_id: customer?.tax_id ?? '',
            business_name: customer?.business_name ?? '',
            customer_type: customer?.customer_type ?? '',
            contact_name: customer?.contact_name ?? '',
            phone: customer?.phone ?? '',
            email: customer?.email ?? '',
            address: customer?.address ?? '',
            salesperson_id: customer?.salesperson_id ?? null,
            price_list_id: customer?.price_list_id ?? null,
            credit_days: customer?.credit_days ?? 0,
            credit_limit: customer?.credit_limit ?? 0,
            is_credit_blocked: customer?.is_credit_blocked ?? false,
            is_active: customer?.is_active ?? true,
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateCustomer | UpdateCustomer | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateCustomer = {
            customer_code: value.customer_code ?? undefined,
            tax_id: value.tax_id ?? undefined,
            business_name: value.business_name ?? undefined,
            customer_type: value.customer_type ?? undefined,
            contact_name: value.contact_name ?? undefined,
            phone: value.phone ?? undefined,
            email: value.email ?? undefined,
            address: value.address ?? undefined,
            salesperson_id: value.salesperson_id ?? undefined,
            price_list_id: value.price_list_id ?? undefined,
            credit_days: value.credit_days ?? undefined,
            credit_limit: value.credit_limit ?? undefined,
            is_credit_blocked: value.is_credit_blocked ?? undefined,
            is_active: value.is_active ?? undefined,
        };

        if (this.customer()) {
            return payload;
        }

        return payload;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
