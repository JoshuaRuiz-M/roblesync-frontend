import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';

import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';

import type { CreateSalesInvoice } from '../../models/sales-invoice.model';
import type { SalesOrderWithDetails } from '../../../sales-orders/models/sales-order.model';
import type { Product } from '../../../../catalog/products/models/product.model';

type SalesInvoiceFormGroup = FormGroup<{
    sales_order_id: FormControl<number | null>;
    invoice_series: FormControl<string>;
    invoice_number: FormControl<string>;
}>;

@Component({
    selector: 'app-sales-invoices-form',
    imports: [ReactiveFormsModule, InputTextModule, SelectModule, MessageModule],
    templateUrl: './sales-invoices-form.html',
    styleUrl: './sales-invoices-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesInvoicesForm {
    private readonly fb = inject(FormBuilder);

    readonly orders = input<SalesOrderWithDetails[]>([]);
    readonly products = input<Product[]>([]);

    readonly submitted = signal(false);
    readonly selectedOrder = signal<SalesOrderWithDetails | null>(null);

    readonly form: SalesInvoiceFormGroup = this.fb.group({
        sales_order_id: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        invoice_series: this.fb.nonNullable.control('', {
            validators: [Validators.required, Validators.maxLength(50)],
        }),
        invoice_number: this.fb.nonNullable.control('', {
            validators: [Validators.required, Validators.maxLength(50)],
        }),
    });

    readonly orderOptions = computed(() =>
        this.orders()
            .filter((order) => order.status === 'RESERVED')
            .map((order) => ({
                label: order.order_number,
                value: Number(order.sales_order_id),
            })),
    );

    readonly totalQuantity = computed(
        () =>
            this.selectedOrder()?.details.reduce(
                (total, detail) => total + Number(detail.quantity),
                0,
            ) ?? 0,
    );

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private readonly quantityFormatter = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });

    constructor() {
        effect(() => {
            const orders = this.orders();
            const orderId = this.form.controls.sales_order_id.value;

            if (orderId === null) {
                this.selectedOrder.set(null);
                return;
            }

            const order = orders.find((item) => Number(item.sales_order_id) === Number(orderId));

            this.selectedOrder.set(order ?? null);
        });
    }

    onOrderChange(orderId: number | string | null): void {
        if (orderId === null || orderId === '') {
            this.selectedOrder.set(null);
            return;
        }

        const order = this.orders().find((item) => Number(item.sales_order_id) === Number(orderId));

        this.selectedOrder.set(order ?? null);
    }

    getProductName(productId: number): string {
        const product = this.products().find((item) => item.product_id === productId);

        return product ? `${product.sku} - ${product.name}` : `Producto #${productId}`;
    }

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    formatQuantity(value: number): string {
        return this.quantityFormatter.format(Number(value));
    }

    getPayload(): CreateSalesInvoice | null {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        if (value.sales_order_id === null) {
            return null;
        }

        const order = this.selectedOrder();

        if (
            !order ||
            order.sales_order_id !== value.sales_order_id ||
            order.status !== 'RESERVED' ||
            order.details.length === 0
        ) {
            return null;
        }

        return {
            sales_order_id: Number(value.sales_order_id),
            invoice_series: value.invoice_series.trim(),
            invoice_number: value.invoice_number.trim(),
        };
    }

    resetForm(): void {
        this.submitted.set(false);

        this.form.reset({
            sales_order_id: null,
            invoice_series: '',
            invoice_number: '',
        });

        this.selectedOrder.set(null);

        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    applyValidationErrors(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const response = error as {
            error?: {
                errors?: Record<string, string[]>;
            };
        };

        const errors = response.error?.errors;

        if (!errors || typeof errors !== 'object') {
            return false;
        }

        let applied = false;

        for (const [field, messages] of Object.entries(errors)) {
            const control = this.form.get(field);

            if (!control || !Array.isArray(messages) || !messages.length) {
                continue;
            }

            control.setErrors({
                server: messages[0],
            });

            control.markAsTouched();
            applied = true;
        }

        return applied;
    }

    getFieldError(control: AbstractControl): string | null {
        if (!control.invalid || (!control.touched && !this.submitted())) {
            return null;
        }

        if (control.hasError('server')) {
            return String(control.getError('server'));
        }

        if (control.hasError('required')) {
            return 'Este campo es obligatorio.';
        }

        if (control.hasError('maxlength')) {
            return 'Se ha superado la longitud máxima permitida.';
        }

        return 'El valor ingresado no es válido.';
    }
}
