'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useTranslation } from 'react-i18next';

interface Settings {
  name: string;
  slug: string;
  config: {
    address?: string;
    phone?: string;
    email?: string;
    currency?: string;
    taxRate?: number;
    themeColor?: string;
    timezone?: string;
    allowPublicRegistration?: boolean;
    requireMfa?: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { showAlert } = useAlert();
  const { t } = useTranslation();

  useEffect(() => {
    fetchSettings();
    // Load from local storage if available
    const cachedCurrency = localStorage.getItem('gymkey_currency');
    if (cachedCurrency && settings) {
        // If we already have settings, we don't need to do anything, 
        // but if we wanted to be optimistic we could set it.
        // However, let's just ensure we save it when we fetch.
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      if (res.data?.config?.currency) {
        localStorage.setItem('gymkey_currency', res.data.config.currency);
      }
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      config: {
        ...settings.config,
        [key]: value
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.patch('/settings', {
        name: settings.name,
        config: settings.config
      });
      
      if (settings.config.currency) {
        localStorage.setItem('gymkey_currency', settings.config.currency);
      }
      
      showAlert('success', 'Configuración guardada exitosamente');
    } catch (e) {
      showAlert('error', 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">{t('common.loading')}</div>;
  if (!settings) return <div className="p-4">No se pudo cargar la configuración</div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('common.settings')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Administra la configuración general de tu gimnasio</p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/30">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'general'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'business'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Negocio
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Seguridad
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nombre del Gimnasio</label>
                  <input
                    type="text"
                    className="w-full h-8 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Slug (URL)</label>
                  <input
                    type="text"
                    disabled
                    className="w-full h-8 px-3 bg-muted border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed"
                    value={settings.slug}
                  />
                  <p className="text-xs text-muted-foreground">El slug no se puede cambiar una vez creado.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Dirección</label>
                  <input
                    type="text"
                    className="w-full h-8 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={settings.config.address || ''}
                    onChange={(e) => handleConfigChange('address', e.target.value)}
                    placeholder="Calle Principal 123"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full h-8 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={settings.config.phone || ''}
                    onChange={(e) => handleConfigChange('phone', e.target.value)}
                    placeholder="+57 300 123 4567"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email de Contacto</label>
                  <input
                    type="email"
                    className="w-full h-8 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={settings.config.email || ''}
                    onChange={(e) => handleConfigChange('email', e.target.value)}
                    placeholder="contacto@tugimnasio.com"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Moneda</label>
                  <CustomSelect
                    className="bg-background"
                    options={[
                      { value: 'USD', label: 'USD - Dólar Estadounidense' },
                      { value: 'COP', label: 'COP - Peso Colombiano' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'MXN', label: 'MXN - Peso Mexicano' },
                    ]}
                    value={settings.config.currency || 'USD'}
                    onChange={(val) => handleConfigChange('currency', val)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Zona Horaria</label>
                  <CustomSelect
                    className="bg-background"
                    options={[
                      { value: 'America/Bogota', label: 'America/Bogota' },
                      { value: 'America/Mexico_City', label: 'America/Mexico_City' },
                      { value: 'America/New_York', label: 'America/New_York' },
                      { value: 'Europe/Madrid', label: 'Europe/Madrid' },
                    ]}
                    value={settings.config.timezone || 'America/Bogota'}
                    onChange={(val) => handleConfigChange('timezone', val)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Impuesto (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full h-8 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={settings.config.taxRate || 0}
                    onChange={(e) => handleConfigChange('taxRate', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Registro Público</h3>
                    <p className="text-xs text-muted-foreground">Permitir que cualquiera se registre en tu gimnasio.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.config.allowPublicRegistration || false}
                      onChange={(e) => handleConfigChange('allowPublicRegistration', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Requerir 2FA</h3>
                    <p className="text-xs text-muted-foreground">Obligar a los administradores a usar autenticación de dos factores.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.config.requireMfa || false}
                      onChange={(e) => handleConfigChange('requireMfa', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="h-8 px-4 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.loading')}
                </>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
