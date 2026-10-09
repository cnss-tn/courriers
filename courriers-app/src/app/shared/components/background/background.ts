import { Component } from '@angular/core';

/** Icône flottante du fond : uniquement des tracés SVG (paths). */
interface BgIcon {
  paths: string[];
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  op: number;
}

/** Fond décoratif partagé (clone campagnes) + icônes courrier animées. */
@Component({
  selector: 'app-background',
  standalone: true,
  template: `
    <div class="composed-backdrop" aria-hidden="true"></div>
    <div class="composed-grid-pattern" aria-hidden="true"></div>
    <div class="bg-icons" aria-hidden="true">
      @for (ic of icons; track $index) {
        <svg
          class="bg-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          [style.left.%]="ic.left"
          [style.top.%]="ic.top"
          [style.width.px]="ic.size"
          [style.height.px]="ic.size"
          [style.opacity]="ic.op"
          [style.animation-duration.s]="ic.dur"
          [style.animation-delay.s]="ic.delay"
        >
          @for (d of ic.paths; track d) {
            <path [attr.d]="d" />
          }
        </svg>
      }
    </div>
  `,
  styles: [
    `
      .bg-icons {
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        overflow: hidden;
      }
      .bg-icon {
        position: absolute;
        color: rgba(14, 157, 181, 0.9);
        animation: bg-float 9s ease-in-out infinite;
      }
      @keyframes bg-float {
        0%,
        100% {
          transform: translateY(-9px) rotate(-6deg);
        }
        50% {
          transform: translateY(9px) rotate(6deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .bg-icon {
          animation: none;
        }
      }
    `,
  ],
})
export class BackgroundComponent {
  /** 23 icônes courrier : enveloppe, envoi, boîte, dossier, archive, stylo... */
  readonly icons: BgIcon[] = [
    {
      paths: [
        'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
        'm22 7-10 6L2 7',
      ],
      left: 8, top: 18, size: 20, dur: 9, delay: 0, op: 0.14,
    },
    {
      paths: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
      left: 88, top: 14, size: 18, dur: 7, delay: -2, op: 0.12,
    },
    {
      paths: [
        'M22 12h-6l-2 3h-4l-2-3H2',
        'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
      ],
      left: 14, top: 78, size: 22, dur: 11, delay: -4, op: 0.11,
    },
    {
      paths: [
        'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
        'M14 2v4a2 2 0 0 0 2 2h4',
        'M10 9H8',
        'M16 13H8',
        'M16 17H8',
      ],
      left: 78, top: 72, size: 20, dur: 8, delay: -1, op: 0.13,
    },
    {
      paths: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'],
      left: 92, top: 45, size: 15, dur: 10, delay: -3, op: 0.12,
    },
    {
      paths: [
        'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      ],
      left: 5, top: 48, size: 18, dur: 7.5, delay: -5, op: 0.1,
    },
    {
      paths: [
        'M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
        'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8',
        'M10 12h4',
      ],
      left: 68, top: 12, size: 16, dur: 9.5, delay: -2.5, op: 0.11,
    },
    {
      paths: [
        'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
      ],
      left: 30, top: 10, size: 14, dur: 8.5, delay: -1.5, op: 0.13,
    },
    {
      paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
      left: 48, top: 85, size: 18, dur: 10.5, delay: -3.5, op: 0.1,
    },
    {
      paths: [
        'M6 9V2h12v7',
        'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
        'M6 14h12v8H6Z',
      ],
      left: 85, top: 88, size: 20, dur: 7, delay: -0.5, op: 0.12,
    },
    {
      paths: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'm21 21-4.3-4.3'],
      left: 60, top: 30, size: 14, dur: 11, delay: -4.5, op: 0.11,
    },
    {
      paths: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
      left: 25, top: 60, size: 15, dur: 8, delay: -2, op: 0.12,
    },
    {
      paths: ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'],
      left: 45, top: 8, size: 15, dur: 8.5, delay: -1, op: 0.12,
    },
    {
      paths: [
        'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
        'M16 2v4',
        'M8 2v4',
        'M3 10h18',
      ],
      left: 18, top: 32, size: 19, dur: 9.5, delay: -3, op: 0.11,
    },
    {
      paths: [
        'M9 2h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z',
        'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
      ],
      left: 75, top: 50, size: 17, dur: 7.5, delay: -2, op: 0.12,
    },
    {
      paths: [
        'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z',
        'M7.5 7.5h.01',
      ],
      left: 35, top: 88, size: 15, dur: 10, delay: -4, op: 0.11,
    },
    {
      paths: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
      left: 45, top: 55, size: 16, dur: 8, delay: -0.5, op: 0.1,
    },
    {
      paths: [
        'M3 6h18',
        'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
        'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      ],
      left: 80, top: 30, size: 15, dur: 9, delay: -2.5, op: 0.12,
    },
    {
      paths: ['M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8'],
      left: 10, top: 93, size: 15, dur: 8, delay: -1, op: 0.12,
    },
    {
      paths: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
      left: 30, top: 95, size: 16, dur: 9.5, delay: -3, op: 0.11,
    },
    {
      paths: [
        'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
        'M4 22v-7',
      ],
      left: 55, top: 92, size: 15, dur: 7.5, delay: -2, op: 0.12,
    },
    {
      paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
      left: 72, top: 94, size: 16, dur: 8.5, delay: -4, op: 0.11,
    },
    {
      paths: ['M12 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M12 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
      left: 90, top: 93, size: 15, dur: 10, delay: -0.5, op: 0.12,
    },
  ];
}
