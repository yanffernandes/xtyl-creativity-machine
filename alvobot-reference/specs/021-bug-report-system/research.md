# Research: Bug Report System

**Feature**: 021-bug-report-system
**Date**: 2026-01-07
**Status**: Complete

## 1. Screenshot Capture

### Decision: html2canvas

### Rationale
- Biblioteca mais madura e amplamente usada para captura de DOM como imagem
- Suporte a CSS complexo (gradients, shadows, transforms)
- Funciona em todos os browsers modernos
- Não requer permissões especiais do usuário
- Bundle size aceitável (~40KB gzipped)

### Alternatives Considered

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **html2canvas** | Maduro, bem documentado, boa compatibilidade | Não captura iframes cross-origin, pode ter issues com web fonts | **CHOSEN** |
| dom-to-image | Mais leve, SVG output | Menos mantido, issues conhecidos com Safari | Rejected |
| Native Canvas API | Sem dependências | Precisa implementar manualmente todo o rendering | Rejected |
| getDisplayMedia | Captura real da tela | Requer permissão explícita, modal do browser | Para vídeo apenas |

### Implementation Notes

```typescript
// Uso básico
import html2canvas from 'html2canvas';

const captureScreenshot = async (): Promise<Blob> => {
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: false,
    scale: window.devicePixelRatio,
    logging: false,
    // Esconder o próprio botão de bug report durante captura
    ignoreElements: (el) => el.classList.contains('bug-report-button'),
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.9);
  });
};
```

### Limitations
- Cross-origin images sem CORS headers aparecem em branco
- Web fonts podem não renderizar corretamente se não estiverem carregadas
- SVGs externos podem não aparecer
- Canvas/WebGL content pode não ser capturado

---

## 2. Screen Recording

### Decision: MediaRecorder API + getDisplayMedia

### Rationale
- API nativa do browser, sem dependências externas
- Suportado em Chrome 72+, Firefox 66+, Edge 79+
- Permite captura de áudio opcional
- Output em webm/vp8 ou webm/vp9

### Browser Compatibility

| Browser | getDisplayMedia | MediaRecorder | Notes |
|---------|-----------------|---------------|-------|
| Chrome 72+ | Yes | Yes | Full support |
| Firefox 66+ | Yes | Yes | Full support |
| Edge 79+ | Yes | Yes | Full support |
| Safari 13+ | Yes | Yes | Limited codec support |
| Mobile Chrome | No | Yes | getDisplayMedia não suportado |
| Mobile Safari | No | Yes | getDisplayMedia não suportado |

### Implementation Notes

```typescript
interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  startTime: number;
}

const startRecording = async (): Promise<MediaStream> => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser', // Prefer current tab
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: false, // Sem áudio por padrão
  });

  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2500000, // 2.5 Mbps
  });

  return stream;
};

const stopRecording = (recorder: MediaRecorder, chunks: Blob[]): Blob => {
  recorder.stop();
  return new Blob(chunks, { type: 'video/webm' });
};
```

### Constraints Applied
- **2 minute limit**: Implementar timer que para gravação automaticamente
- **File size**: Com 2.5 Mbps, 2 min = ~37.5 MB máx (acima do limite de 10MB)
  - Solução: Reduzir bitrate para 800kbps (~12MB para 2 min) ou limitar para 1 min
  - **Decisão**: 1 minuto de gravação com 1.3 Mbps = ~10MB

---

## 3. Console Error Interception

### Decision: Override console.error/warn com buffer circular

### Rationale
- Abordagem simples e sem dependências
- Captura erros em tempo real antes do bug report
- Buffer circular evita uso excessivo de memória
- Preserva comportamento original do console

### Implementation Notes

```typescript
interface CapturedError {
  type: 'error' | 'warn';
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
}

class ConsoleErrorCapture {
  private errors: CapturedError[] = [];
  private readonly maxErrors = 50;
  private originalError: typeof console.error;
  private originalWarn: typeof console.warn;

  constructor() {
    this.originalError = console.error;
    this.originalWarn = console.warn;
    this.intercept();
    this.setupGlobalErrorHandler();
  }

  private intercept() {
    console.error = (...args) => {
      this.capture('error', args);
      this.originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.capture('warn', args);
      this.originalWarn.apply(console, args);
    };
  }

  private setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      this.errors.push({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: event.filename,
      });
      this.trim();
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
      });
      this.trim();
    });
  }

  private capture(type: 'error' | 'warn', args: any[]) {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    this.errors.push({
      type,
      message,
      timestamp: Date.now(),
    });
    this.trim();
  }

  private trim() {
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getErrors(): CapturedError[] {
    return [...this.errors];
  }

  clear() {
    this.errors = [];
  }
}

// Inicializar no entry point da aplicação
export const consoleCapture = new ConsoleErrorCapture();
```

### Additional Browser Info Capture

```typescript
interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  online: boolean;
  cookiesEnabled: boolean;
}

const getBrowserInfo = (): BrowserInfo => ({
  userAgent: navigator.userAgent,
  language: navigator.language,
  platform: navigator.platform,
  screenWidth: screen.width,
  screenHeight: screen.height,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio,
  online: navigator.onLine,
  cookiesEnabled: navigator.cookieEnabled,
});
```

---

## 4. ClickUp Email Integration

### Decision: Resend (já usado no projeto) para enviar email formatado

### Rationale
- Resend já está configurado no backend (`resend: "^6.6.0"`)
- ClickUp suporta criação de tasks via email para qualquer List
- Não requer API keys do ClickUp nem OAuth
- Usuário configura apenas o email da List (formato: `list.xxxx@tasks.clickup.com`)

### ClickUp Email-to-Task Format

```
To: list.abc123@tasks.clickup.com
Subject: [BUG] {severity}: {title}

Body (Markdown suportado):
---
**Bug Report from AlvoBot**

**Description:**
{user_description}

**Page URL:** {page_url}

**Browser:** {browser_info}

**Screenshot:** {public_url_to_screenshot}

**Reported by:** {user_email}
**Reported at:** {timestamp}

**Console Errors ({count}):**
```
{console_errors_formatted}
```

---
Severity: {severity}
Type: {bug_type}
```

### Implementation Notes

```typescript
// backend/src/modules/bug-report/bug-report.service.ts
import { Resend } from 'resend';

interface SendClickUpEmailDto {
  clickupEmail: string;  // list.xxx@tasks.clickup.com
  bugReport: {
    title: string;
    description: string;
    severity: string;
    type: string;
    pageUrl: string;
    browserInfo: object;
    consoleErrors: object[];
    screenshotUrl?: string;
    reporterEmail: string;
    createdAt: string;
  };
}

async sendToClickUp(dto: SendClickUpEmailDto): Promise<{ success: boolean }> {
  const resend = new Resend(this.configService.get('RESEND_API_KEY'));

  const subject = `[BUG] ${dto.bugReport.severity}: ${dto.bugReport.title}`;

  const body = this.formatEmailBody(dto.bugReport);

  await resend.emails.send({
    from: 'AlvoBot <bugs@alvobot.com>',
    to: dto.clickupEmail,
    subject,
    text: body,
  });

  return { success: true };
}
```

### Considerations
- Email enviado de forma assíncrona (fire-and-forget)
- Se falhar, bug report ainda é salvo no Supabase
- Não há confirmação de criação da task (limitação do email)
- Usuário pode verificar no ClickUp se task foi criada

---

## 5. Dependencies Summary

### Frontend (new)
```json
{
  "html2canvas": "^1.4.1"
}
```
Note: MediaRecorder API é nativa, não precisa de dependência.

### Backend (existing)
- `resend` - Já instalado para envio de emails

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| html2canvas não captura iframes cross-origin | Medium | Documentar limitação, fallback para report sem screenshot |
| getDisplayMedia não suportado em mobile | Low | Detectar e desabilitar botão de gravação em mobile |
| ClickUp email rate limiting | Low | Debounce no frontend, retry no backend |
| Storage costs com indefinite retention | Medium | Monitorar uso, considerar lifecycle rules futuro |
| Large video files | Medium | Limitar a 1 min, comprimir bitrate |
