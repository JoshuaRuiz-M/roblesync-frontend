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
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import type { Product } from '../../../../catalog/products/models/product.model';

import type {
    CreatePriceList,
    CreatePriceListDetail,
    PriceListWithDetails,
} from '../../models/price-list.model';

type DetailForm = FormGroup<{
    product_id: FormControl<number | null>;
    unit_price: FormControl<number>;
}>;

type PriceListFormGroup = FormGroup<{
    code: FormControl<string>;
    name: FormControl<string>;
    description: FormControl<string>;
    is_active: FormControl<boolean>;
    details: FormArray<DetailForm>;
}>;

@Component({
    selector: 'app-price-lists-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        TextareaModule,
        ButtonModule,
        MessageModule,
        CheckboxModule,
        TooltipModule,
    ],
    templateUrl: './price-lists-form.html',
    styleUrl: './price-lists-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceListsForm {
    private readonly fb = inject(FormBuilder);

    readonly priceList = input<PriceListWithDetails | null>(null);
    readonly products = input<Product[]>([]);

    readonly submitted = signal(false);
    readonly formVersion = signal(0);

    readonly form: PriceListFormGroup = this.fb.group({
        code: this.fb.nonNullable.control('', {
            validators: [Validators.required, Validators.maxLength(50)],
        }),
        name: this.fb.nonNullable.control('', {
            validators: [Validators.required, Validators.maxLength(150)],
        }),
        description: this.fb.nonNullable.control('', {
            validators: [Validators.maxLength(500)],
        }),
        is_active: this.fb.nonNullable.control(true),
        details: this.fb.array<DetailForm>([]),
    });

    readonly productOptions = computed(() =>
        this.products()
            .filter((product) => product.is_active)
            .map((product) => ({
                label: `${product.sku} - ${product.name}`,
                value: product.product_id,
            })),
    );

    readonly totalProducts = computed(() => {
        this.formVersion();

        return this.details.controls.filter((detail) => detail.controls.product_id.value !== null)
            .length;
    });

    get details(): FormArray<DetailForm> {
        return this.form.controls.details;
    }

    get detailControls(): DetailForm[] {
        return this.details.controls;
    }

    constructor() {
        this.form.valueChanges.subscribe(() => {
            this.formVersion.update((value) => value + 1);
        });

        effect(() => {
            this.resetForm(this.priceList());
        });
    }

    private createDetail(detail?: Partial<CreatePriceListDetail>): DetailForm {
        return this.fb.group({
            product_id: this.fb.control<number | null>(detail?.product_id ?? null, {
                validators: [Validators.required],
            }),
            unit_price: this.fb.nonNullable.control(detail?.unit_price ?? 0, {
                validators: [Validators.required, Validators.min(0), Validators.max(99999.9999)],
            }),
        });
    }

    addDetail(): void {
        this.details.push(this.createDetail());
    }

    removeDetail(index: number): void {
        if (this.details.length <= 1) {
            return;
        }

        this.details.removeAt(index);
        this.validateDuplicateProducts();
    }

    onProductChange(index: number, productId: number | null): void {
        const detail = this.details.at(index);

        if (!detail || productId === null) {
            return;
        }

        const product = this.products().find((item) => item.product_id === productId);

        if (!product) {
            return;
        }

        detail.controls.unit_price.setValue(Number(product.list_price ?? 0));

        this.validateDuplicateProducts();
    }

    getAvailableProducts(index: number): {
        label: string;
        value: number;
    }[] {
        this.formVersion();

        const selectedIds = new Set(
            this.details.controls
                .filter((_, detailIndex) => detailIndex !== index)
                .map((detail) => detail.controls.product_id.value)
                .filter((value): value is number => value !== null),
        );

        const currentId = this.details.at(index)?.controls.product_id.value;

        return this.products()
            .filter((product) => product.is_active || product.product_id === currentId)
            .filter((product) => !selectedIds.has(product.product_id))
            .map((product) => ({
                label: `${product.sku} - ${product.name}`,
                value: product.product_id,
            }));
    }

    private validateDuplicateProducts(): boolean {
        const ids = this.details.controls
            .map((detail) => detail.controls.product_id.value)
            .filter((id): id is number => id !== null);

        const hasDuplicates = new Set(ids).size !== ids.length;

        if (hasDuplicates) {
            this.details.setErrors({
                ...this.details.errors,
                duplicateProducts: true,
            });
        } else if (this.details.hasError('duplicateProducts')) {
            const errors = { ...this.details.errors };

            delete errors['duplicateProducts'];

            this.details.setErrors(Object.keys(errors).length ? errors : null);
        }

        return !hasDuplicates;
    }

    getPayload(): CreatePriceList | null {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        const validProducts = this.validateDuplicateProducts();

        if (this.form.invalid || this.details.length === 0 || !validProducts) {
            return null;
        }

        const value = this.form.getRawValue();

        return {
            code: value.code.trim(),
            name: value.name.trim(),
            description: value.description.trim() || null,
            is_active: value.is_active,
            details: value.details.map((detail) => ({
                product_id: detail.product_id!,
                unit_price: Number(detail.unit_price),
            })),
        };
    }

    resetForm(priceList: PriceListWithDetails | null): void {
        this.submitted.set(false);
        this.details.clear();

        if (priceList) {
            this.form.patchValue({
                code: priceList.code,
                name: priceList.name,
                description: priceList.description ?? '',
                is_active: priceList.is_active,
            });

            for (const detail of priceList.details) {
                this.details.push(
                    this.createDetail({
                        product_id: detail.product_id,
                        unit_price: Number(detail.unit_price),
                    }),
                );
            }
        } else {
            this.form.reset({
                code: '',
                name: '',
                description: '',
                is_active: true,
            });
        }

        if (this.details.length === 0) {
            this.addDetail();
        }

        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.formVersion.update((value) => value + 1);
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

        if (control.hasError('min')) {
            return 'El precio no puede ser negativo.';
        }

        if (control.hasError('max')) {
            return 'El precio supera el máximo permitido.';
        }

        if (control.hasError('maxlength')) {
            return 'Se ha superado la longitud máxima permitida.';
        }

        return 'El valor ingresado no es válido.';
    }

    formatPrice(value: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(Number(value));
    }
}
