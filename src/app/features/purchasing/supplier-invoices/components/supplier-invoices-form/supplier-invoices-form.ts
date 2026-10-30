import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    input,
    signal,
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';

import type { SupplierInvoice, CreateSupplierInvoice } from '../../models/supplier-invoice.model';
import type { Supplier } from '../../../suppliers/models/supplier.model';
import type { PurchaseOrder } from '../../../purchase-orders/models/purchase-order.model';

import {
    SUPPLIER_INVOICE_STATUS_OPTIONS,
    type SupplierInvoiceStatus,
} from '../../models/supplier-invoice-status.model';
import { applyServerValidationErrors } from '../../../../../core/http/utils/form-validation.util';

function datesValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('invoice_date')?.value as Date | null;
    const end = control.get('due_date')?.value as Date | null;

    if (!start || !end) return null;

    return end.getTime() >= start.getTime() ? null : { invalidDates: true };
}

@Component({
    selector: 'app-supplier-invoices-form',
    imports: [
        ReactiveFormsModule,
        SelectModule,
        InputTextModule,
        InputNumberModule,
        DatePickerModule,
        TextareaModule,
        TagModule,
    ],
    templateUrl: './supplier-invoices-form.html',
    styleUrl: './supplier-invoices-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierInvoicesForm {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);

    readonly invoice = input<SupplierInvoice | null>(null);
    readonly supplierItems = input<Supplier[]>([]);
    readonly purchaseOrderItems = input<PurchaseOrder[]>([]);

    readonly statusOptions = SUPPLIER_INVOICE_STATUS_OPTIONS;
    readonly selectedSupplierId = signal<number | null>(null);

    readonly form = this.fb.group(
        {
            supplier_id: this.fb.control<number | null>(null, Validators.required),
            purchase_order_id: this.fb.control<number | null>(null, Validators.required),
            invoice_number: this.fb.nonNullable.control('', [
                Validators.required,
                Validators.maxLength(50),
            ]),
            invoice_date: this.fb.control<Date | null>(null, Validators.required),
            due_date: this.fb.control<Date | null>(null, Validators.required),
            subtotal: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
            tax_amount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
            total_amount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
            status: this.fb.nonNullable.control<SupplierInvoiceStatus>(
                'REGISTERED',
                Validators.required,
            ),
            notes: this.fb.control<string | null>(null, Validators.maxLength(500)),
        },
        { validators: datesValidator },
    );

    readonly supplierOptions = computed(() =>
        this.supplierItems()
            .filter(
                (supplier) =>
                    supplier.is_active || supplier.supplier_id === this.invoice()?.supplier_id,
            )
            .map((supplier) => ({
                label: `${supplier.business_name} · ${supplier.tax_id}`,
                value: supplier.supplier_id,
            })),
    );

    readonly purchaseOrderOptions = computed(() =>
        this.purchaseOrderItems()
            .filter(
                (order) =>
                    order.supplier_id === this.selectedSupplierId() &&
                    (order.status !== 'CANCELLED' ||
                        order.purchase_order_id === this.invoice()?.purchase_order_id),
            )
            .map((order) => ({
                label: order.order_number,
                value: order.purchase_order_id,
            })),
    );

    constructor() {
        this.form.controls.supplier_id.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((supplierId) => {
                this.selectedSupplierId.set(supplierId);
                this.form.controls.purchase_order_id.setValue(null);
            });

        this.form.controls.subtotal.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.calculateTotal());

        this.form.controls.tax_amount.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.calculateTotal());
    }

    private calculateTotal(): void {
        const subtotal = Number(this.form.controls.subtotal.value);
        const tax = Number(this.form.controls.tax_amount.value);

        this.form.controls.total_amount.setValue(Math.round((subtotal + tax) * 100) / 100, {
            emitEvent: false,
        });
    }

    private toDate(value: Date | string | null | undefined): Date | null {
        if (!value) return null;

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : new Date(value);
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    resetForm(invoice: SupplierInvoice | null): void {
        this.form.reset(
            {
                supplier_id: invoice?.supplier_id ?? null,
                purchase_order_id: invoice?.purchase_order_id ?? null,
                invoice_number: invoice?.invoice_number ?? '',
                invoice_date: this.toDate(invoice?.invoice_date),
                due_date: this.toDate(invoice?.due_date),
                subtotal: invoice ? Number(invoice.subtotal) : 0,
                tax_amount: invoice ? Number(invoice.tax_amount) : 0,
                total_amount: invoice ? Number(invoice.total_amount) : 0,
                status: invoice?.status ?? 'REGISTERED',
                notes: invoice?.notes ?? null,
            },
            { emitEvent: false },
        );

        this.selectedSupplierId.set(invoice?.supplier_id ?? null);
    }

    getPayload(): CreateSupplierInvoice | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        if (
            value.supplier_id === null ||
            value.purchase_order_id === null ||
            value.invoice_date === null ||
            value.due_date === null
        ) {
            return null;
        }

        const supplierId = Number(value.supplier_id);
        const purchaseOrderId = Number(value.purchase_order_id);

        if (
            !Number.isInteger(supplierId) ||
            supplierId <= 0 ||
            !Number.isInteger(purchaseOrderId) ||
            purchaseOrderId <= 0
        ) {
            return null;
        }

        const selectedOrder = this.purchaseOrderItems().find(
            (order) => order.purchase_order_id === purchaseOrderId,
        );

        if (
            !selectedOrder ||
            selectedOrder.supplier_id !== supplierId ||
            (selectedOrder.status === 'CANCELLED' &&
                selectedOrder.purchase_order_id !== this.invoice()?.purchase_order_id)
        ) {
            this.form.controls.purchase_order_id.setErrors({
                invalidPurchaseOrder: true,
            });

            return null;
        }

        return {
            supplier_id: supplierId,
            purchase_order_id: purchaseOrderId,
            invoice_number: value.invoice_number.trim(),
            invoice_date: this.formatDateForApi(value.invoice_date),
            due_date: this.formatDateForApi(value.due_date),
            subtotal: Number(value.subtotal),
            tax_amount: Number(value.tax_amount),
            total_amount: Number(value.total_amount),
            status: value.status,
            notes: value.notes?.trim() || null,
        };
    }

    hasError(field: keyof typeof this.form.controls): boolean {
        const control = this.form.controls[field];
        return control.invalid && (control.touched || control.dirty);
    }

    private formatDateForApi(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
