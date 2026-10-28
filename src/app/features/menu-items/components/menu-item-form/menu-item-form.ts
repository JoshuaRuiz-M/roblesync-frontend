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

import type { MenuItem, CreateMenuItem } from '../../models/menu-item.model';
import { applyServerValidationErrors } from '../../../../core/http/utils/form-validation.util';
import { getFormFieldError } from '../../../../shared/utils/form-validation.util';

interface ParentOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-menu-item-form',
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
    ],
    templateUrl: './menu-item-form.html',
    styleUrl: './menu-item-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemForm {
    private readonly fb = inject(FormBuilder);

    readonly menuItem = input<MenuItem | null>(null);
    readonly parentItems = input<MenuItem[]>([]);

    readonly formChange = output<boolean>();

    readonly parentOptions = computed<ParentOption[]>(() => {
        const items = this.parentItems();
        const current = this.menuItem();

        const excluded = current
            ? this.getDescendantIds(current.menu_item_id, items)
            : new Set<number>();

        return items
            .filter((item) => !excluded.has(item.menu_item_id))
            .map((item) => ({
                label: item.label,
                value: item.menu_item_id,
            }));
    });

    readonly form = this.fb.group({
        parent_id: this.fb.control<number | null>(null),

        code: this.fb.nonNullable.control('', [
            Validators.required,
            Validators.maxLength(100),
            Validators.pattern(/^[A-Z][A-Z0-9_]*$/),
        ]),

        label: this.fb.nonNullable.control('', [
            Validators.required,
            Validators.maxLength(150),
            Validators.pattern(/.*\S.*/),
        ]),

        path: this.fb.control<string | null>(null, [Validators.maxLength(255)]),

        icon: this.fb.control<string | null>(null, [Validators.maxLength(100)]),

        sort_order: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),

        is_active: this.fb.nonNullable.control(true),
    });

    readonly validationMessages = {
        code: {
            required: 'El código del menú es obligatorio.',
            maxlength: 'El código no puede superar los 100 caracteres.',
            pattern:
                'El código debe iniciar con una letra mayúscula y contener únicamente letras mayúsculas, números y guiones bajos.',
        },
        label: {
            required: 'La etiqueta del menú es obligatoria.',
            maxlength: 'La etiqueta no puede superar los 150 caracteres.',
            pattern: 'La etiqueta no puede contener únicamente espacios en blanco.',
        },
        path: {
            maxlength: 'La ruta no puede superar los 255 caracteres.',
        },
        icon: {
            maxlength: 'El ícono no puede superar los 100 caracteres.',
        },
        sort_order: {
            required: 'El orden de visualización es obligatorio.',
            min: 'El orden de visualización no puede ser negativo.',
        },
    };

    constructor() {
        effect(() => {
            const item = this.menuItem();

            if (item) {
                this.form.reset({
                    parent_id: item.parent_id,
                    code: item.code,
                    label: item.label,
                    path: item.path,
                    icon: item.icon,
                    sort_order: item.sort_order,
                    is_active: item.is_active,
                });
            } else {
                this.form.reset({
                    parent_id: null,
                    code: '',
                    label: '',
                    path: null,
                    icon: null,
                    sort_order: 0,
                    is_active: true,
                });
            }

            this.formChange.emit(this.form.valid);
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    getPayload(): CreateMenuItem | null {
        const code = this.form.controls.code.value.trim().toUpperCase();

        const label = this.form.controls.label.value.trim();

        this.form.patchValue({
            code,
            label,
        });

        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        return {
            parent_id: value.parent_id,
            code: value.code,
            label: value.label,
            path: value.path?.trim() || null,
            icon: value.icon?.trim() || null,
            sort_order: value.sort_order,
            is_active: value.is_active,
        };
    }

    resetForm(item: MenuItem | null): void {
        this.form.reset({
            parent_id: item?.parent_id ?? null,
            code: item?.code ?? '',
            label: item?.label ?? '',
            path: item?.path ?? null,
            icon: item?.icon ?? null,
            sort_order: item?.sort_order ?? 0,
            is_active: item?.is_active ?? true,
        });
    }

    private getDescendantIds(menuItemId: number, items: MenuItem[]): Set<number> {
        const excluded = new Set<number>([menuItemId]);

        let changed = true;

        while (changed) {
            changed = false;

            for (const item of items) {
                if (
                    item.parent_id !== null &&
                    excluded.has(item.parent_id) &&
                    !excluded.has(item.menu_item_id)
                ) {
                    excluded.add(item.menu_item_id);
                    changed = true;
                }
            }
        }

        return excluded;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
