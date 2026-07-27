import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  TestTube2,
} from 'lucide-react';
import {
  listAiProviders,
  testAiProvider,
  updateAiProvider,
  type AiProviderConfig,
  type AiProviderName,
} from '../lib/aiConfigApi';
import { friendlyError } from '../lib/errors';

const PROVIDER_LABELS: Record<AiProviderName, { label: string; detail: string; vision: boolean }> =
  {
    groq: {
      label: 'Groq',
      detail: 'Principal rápido y compatible con herramientas.',
      vision: true,
    },
    gemini: { label: 'Gemini', detail: 'Respaldo multimodal para texto e imágenes.', vision: true },
    deepseek: {
      label: 'DeepSeek',
      detail: 'Respaldo económico para conversaciones de texto.',
      vision: false,
    },
    openai: {
      label: 'OpenAI',
      detail: 'Respaldo general para texto y análisis visual.',
      vision: true,
    },
  };

function toDraft(config: AiProviderConfig) {
  return {
    enabled: config.enabled,
    priority: String(config.priority),
    base_url: config.base_url,
    text_model: config.text_model ?? '',
    vision_model: config.vision_model ?? '',
    api_key: '',
  };
}

export default function ConfiguracionIaPage() {
  const [configs, setConfigs] = useState<AiProviderConfig[]>([]);
  const [selected, setSelected] = useState<AiProviderName>('groq');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft] = useState<ReturnType<typeof toDraft> | null>(null);

  const config = useMemo(
    () => configs.find((item) => item.provider === selected) ?? null,
    [configs, selected],
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await listAiProviders();
      setConfigs(data);
      setSelected((current) =>
        data.some((item) => item.provider === current) ? current : (data[0]?.provider ?? current),
      );
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (config) {
      setDraft(toDraft(config));
      setShowKey(false);
    }
  }, [config]);

  function chooseProvider(provider: AiProviderName): void {
    setSelected(provider);
    setError('');
    setNotice('');
  }

  function change(field: keyof NonNullable<typeof draft>, value: string | boolean): void {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function save(): Promise<void> {
    if (!config || !draft) return;
    const priority = Number.parseInt(draft.priority, 10);
    if (!Number.isInteger(priority) || priority < 1) {
      setError('La prioridad debe ser un número entero mayor que cero.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateAiProvider(config.provider, {
        enabled: draft.enabled,
        priority,
        base_url: draft.base_url,
        text_model: draft.text_model || null,
        vision_model: draft.vision_model || null,
        ...(draft.api_key.trim() ? { api_key: draft.api_key.trim() } : {}),
      });
      setConfigs((current) =>
        current.map((item) => (item.provider === updated.provider ? updated : item)),
      );
      setNotice('Configuración guardada. Se aplicará en la siguiente solicitud, sin redeploy.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function test(): Promise<void> {
    if (!config) return;
    setTesting(true);
    setError('');
    setNotice('');
    try {
      const result = await testAiProvider(config.provider);
      setNotice(result.message);
      if (!result.ok) setError(result.message);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-caoba" />
      </div>
    );
  }

  if (!config || !draft) {
    return (
      <div className="rounded-3xl-3 bg-perla p-6 text-sm text-arena">
        No hay proveedores configurados.
      </div>
    );
  }

  const providerInfo = PROVIDER_LABELS[config.provider];
  return (
    <section className="mx-auto max-w-5xl pb-24">
      <div className="mb-6 rounded-hero bg-catedral px-6 py-7 text-lienzo sm:px-8">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl-2 bg-sol-camba text-catedral">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-arena">
              Operación segura
            </p>
            <h2 className="mt-1 text-2xl font-semibold">IA y respaldos</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-almendra">
              Definí el orden de respaldo y actualizá credenciales sin volver a desplegar. Las
              claves se guardan cifradas y nunca se vuelven a mostrar.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex gap-2 rounded-3xl-2 border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="mb-4 flex gap-2 rounded-3xl-2 border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-3xl-3 bg-yeso p-2 sm:grid-cols-4">
        {configs.map((item) => {
          const active = item.provider === selected;
          return (
            <button
              key={item.provider}
              type="button"
              onClick={() => chooseProvider(item.provider)}
              className={`min-h-12 rounded-3xl-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${active ? 'bg-perla text-tierra shadow-sm' : 'text-caoba hover:bg-perla/60'}`}
            >
              <span className="block truncate">{PROVIDER_LABELS[item.provider].label}</span>
              <span
                className={`mt-0.5 block text-[10px] font-medium ${item.enabled && item.has_api_key ? 'text-green-700' : 'text-arena'}`}
              >
                {item.enabled && item.has_api_key ? 'Listo' : 'Inactivo'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="rounded-3xl-3 bg-perla p-5 sm:p-7"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-tierra">{providerInfo.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-arena">{providerInfo.detail}</p>
            </div>
            <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pill bg-yeso px-3 text-xs font-semibold text-ladrillo">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => change('enabled', event.target.checked)}
                className="h-4 w-4 accent-caoba"
              />
              Activado
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ladrillo">
              Prioridad <span className="font-normal text-arena">(1 es primero)</span>
              <input
                inputMode="numeric"
                value={draft.priority}
                onChange={(event) => change('priority', event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-3xl-2 border border-arcilla bg-lienzo px-4 text-sm font-normal text-tierra outline-none focus:border-caoba"
              />
            </label>
            <label className="text-xs font-semibold text-ladrillo">
              URL base
              <input
                value={draft.base_url}
                onChange={(event) => change('base_url', event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-3xl-2 border border-arcilla bg-lienzo px-4 text-sm font-normal text-tierra outline-none focus:border-caoba"
              />
            </label>
            <label className="text-xs font-semibold text-ladrillo">
              Modelo de texto
              <input
                value={draft.text_model}
                onChange={(event) => change('text_model', event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-3xl-2 border border-arcilla bg-lienzo px-4 text-sm font-normal text-tierra outline-none focus:border-caoba"
              />
            </label>
            <label className="text-xs font-semibold text-ladrillo">
              Modelo de visión
              {providerInfo.vision ? (
                <input
                  value={draft.vision_model}
                  onChange={(event) => change('vision_model', event.target.value)}
                  className="mt-1.5 min-h-12 w-full rounded-3xl-2 border border-arcilla bg-lienzo px-4 text-sm font-normal text-tierra outline-none focus:border-caoba"
                />
              ) : (
                <span className="mt-1.5 flex min-h-12 items-center rounded-3xl-2 border border-arcilla bg-yeso px-4 text-sm font-normal text-arena">
                  No disponible en DeepSeek
                </span>
              )}
            </label>
          </div>

          <label className="mt-4 block text-xs font-semibold text-ladrillo">
            Nueva clave API{' '}
            <span className="font-normal text-arena">
              {config.has_api_key ? '· hay una clave guardada' : '· requerida para activar'}
            </span>
            <span className="relative mt-1.5 block">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-arena" />
              <input
                type={showKey ? 'text' : 'password'}
                autoComplete="new-password"
                value={draft.api_key}
                onChange={(event) => change('api_key', event.target.value)}
                placeholder={
                  config.has_api_key ? 'Dejá vacío para conservarla' : 'Pegá la clave del proveedor'
                }
                className="min-h-12 w-full rounded-3xl-2 border border-arcilla bg-lienzo py-3 pl-11 pr-12 text-sm font-normal text-tierra outline-none focus:border-caoba"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                className="absolute right-1 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-caoba hover:bg-yeso"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <div className="mt-6 flex flex-col gap-3 border-t border-arcilla pt-5 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="order-1 flex min-h-12 items-center justify-center gap-2 rounded-pill bg-catedral px-6 text-sm font-semibold text-lienzo transition-colors hover:bg-ladrillo disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={testing || saving || !config.enabled || !config.has_api_key}
              className="order-2 flex min-h-12 items-center justify-center gap-2 rounded-pill border border-arcilla px-6 text-sm font-semibold text-caoba transition-colors hover:bg-yeso disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TestTube2 className="h-4 w-4" />
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
          </div>
        </form>

        <aside className="rounded-3xl-3 bg-yeso p-5 text-sm text-tierra">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-caoba">
            Orden de respaldo
          </p>
          <ol className="mt-4 space-y-3">
            {[...configs]
              .sort((a, b) => a.priority - b.priority)
              .map((item, index) => (
                <li key={item.provider} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-perla text-xs font-bold text-caoba">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {PROVIDER_LABELS[item.provider].label}
                    </span>
                    <span className="text-xs text-arena">
                      {item.enabled && item.has_api_key ? 'Disponible' : 'No participa'}
                    </span>
                  </span>
                </li>
              ))}
          </ol>
          <button
            type="button"
            onClick={load}
            className="mt-6 flex min-h-11 items-center gap-2 text-xs font-semibold text-caoba hover:text-tierra"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar estado
          </button>
        </aside>
      </div>
    </section>
  );
}
