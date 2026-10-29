import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    effect,
    input,
    signal,
    viewChild,
} from '@angular/core';

import JsBarcode from 'jsbarcode';

import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-product-barcode',
    imports: [ButtonModule],
    templateUrl: './product-barcode.html',
    styleUrl: './product-barcode.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBarcode implements AfterViewInit {
    readonly value = input.required<string>();
    readonly productName = input('');

    readonly barcodeElement = viewChild<ElementRef<SVGSVGElement>>('barcodeSvg');

    readonly invalidBarcode = signal(false);
    readonly copied = signal(false);

    private viewReady = false;

    constructor() {
        effect(() => {
            const value = this.value();
            this.barcodeElement();

            if (this.viewReady) {
                this.renderBarcode(value);
            }
        });
    }

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.renderBarcode(this.value());
    }

    private isValidEan13(value: string): boolean {
        if (!/^\d{13}$/.test(value)) {
            return false;
        }

        const digits = value.split('').map(Number);

        const sum = digits
            .slice(0, 12)
            .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);

        const checkDigit = (10 - (sum % 10)) % 10;

        return checkDigit === digits[12];
    }

    private renderBarcode(value: string): void {
        const svg = this.barcodeElement()?.nativeElement;

        if (!svg) {
            return;
        }

        svg.replaceChildren();

        const code = value.trim();

        if (!code) {
            this.invalidBarcode.set(true);
            return;
        }

        const format = this.isValidEan13(code) ? 'EAN13' : 'CODE128';

        try {
            JsBarcode(svg, code, {
                format,
                width: 2,
                height: 75,
                margin: 12,
                displayValue: true,
                fontSize: 15,
                lineColor: '#111827',
                background: '#ffffff',
            });

            this.invalidBarcode.set(false);
        } catch {
            this.invalidBarcode.set(true);
            svg.replaceChildren();
        }
    }

    async copyBarcode(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.value());
            this.copied.set(true);
        } catch {
            this.copied.set(false);
        }
    }

    printBarcode(): void {
        const svg = this.barcodeElement()?.nativeElement;

        if (!svg || this.invalidBarcode()) {
            return;
        }

        const svgContent = new XMLSerializer().serializeToString(svg);

        const printWindow = window.open('', '_blank', 'width=650,height=450');

        if (!printWindow) {
            return;
        }

        const title = this.escapeHtml(this.productName());

        printWindow.document.open();
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Etiqueta de producto</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 24px;
                    }

                    h2 {
                        font-size: 16px;
                        margin-bottom: 16px;
                    }

                    svg {
                        max-width: 100%;
                        height: auto;
                    }

                    @page {
                        margin: 10mm;
                    }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                ${svgContent}
            </body>
            </html>
        `);
        printWindow.document.close();

        printWindow.addEventListener(
            'load',
            () => {
                printWindow.focus();
                printWindow.print();
            },
            { once: true },
        );
    }

    private escapeHtml(value: string): string {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}
