'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  Globe, 
  Shield, 
  Palette, 
  Share2, 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram, 
  Twitter,
  Loader2,
  Building2,
  Clock,
  DollarSign,
  Languages
} from 'lucide-react';

interface Settings {
  name: string;
  slug: string;
  config: {
    // Contact
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    
    // Regional
    currency?: string;
    taxRate?: number;
    timezone?: string;
    locale?: string;
    
    // Appearance
    themeColor?: string;
    
    // Security
    showPublicPortal?: boolean;
    requireMfa?: boolean;
    offlineToleranceMinutes?: number;
    
    // Social
    social?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
}

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'regional', label: 'Regional', icon: Globe },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'security', label: 'Seguridad', icon: Shield },
];

const ADMIN_SETTINGS_ROLES = ['SUPER_ADMIN', 'GYM_ADMIN'] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!authUser) return;
    if (!ADMIN_SETTINGS_ROLES.includes(authUser.role as (typeof ADMIN_SETTINGS_ROLES)[number])) {
      router.replace('/dashboard');
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data;
        if (!data.config.social) data.config.social = {};
        if (data.config.showPublicPortal === undefined) {
          data.config.showPublicPortal = Boolean(data.config.allowPublicRegistration);
        }
        setSettings(data);

        if (data?.config?.currency) {
          localStorage.setItem('gymkey_currency', data.config.currency);
        }
      } catch (e) {
        console.error(e);
        showAlert('error', 'Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [authUser, router, showAlert]);

  if (
    authUser &&
    !ADMIN_SETTINGS_ROLES.includes(authUser.role as (typeof ADMIN_SETTINGS_ROLES)[number])
  ) {
    return null;
  }

  const handleConfigChange = (key: string, value: string | number | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      config: {
        ...settings.config,
        [key]: value
      }
    });
  };

  const handleSocialChange = (key: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      config: {
        ...settings.config,
        social: {
          ...settings.config.social,
          [key]: value
        }
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

      await refreshSettings();

      showAlert('success', 'Configuración guardada exitosamente');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Configuración</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona los ajustes generales de tu gimnasio</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 h-8 px-3 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar Cambios
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-6 bg-primary rounded-r-full hidden lg:block"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'general' && (
                <div className="grid gap-6">
                  {/* Basic Info Card */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Información Básica
                    </h2>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre del Gimnasio</label>
                        <input
                          type="text"
                          value={settings.name}
                          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                          className="w-full h-8 px-3 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="Mi Gimnasio"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción</label>
                        <textarea
                          value={settings.config.description || ''}
                          onChange={(e) => handleConfigChange('description', e.target.value)}
                          className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[100px] resize-none"
                          placeholder="Breve descripción de tu gimnasio..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">URL Slug</label>
                        <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg text-muted-foreground border border-transparent">
                          <Globe className="w-4 h-4" />
                          <span className="text-sm">gymkey.app/{settings.slug}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Card */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      Contacto
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={settings.config.address || ''}
                            onChange={(e) => handleConfigChange('address', e.target.value)}
                            className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="Calle Principal 123"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="tel"
                            value={settings.config.phone || ''}
                            onChange={(e) => handleConfigChange('phone', e.target.value)}
                            className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="+1 234 567 890"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email de Contacto</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="email"
                            value={settings.config.email || ''}
                            onChange={(e) => handleConfigChange('email', e.target.value)}
                            className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="contacto@gimnasio.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sitio Web</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="url"
                            value={settings.config.website || ''}
                            onChange={(e) => handleConfigChange('website', e.target.value)}
                            className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="https://gimnasio.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'regional' && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Configuración Regional
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Moneda Principal</label>
                      <CustomSelect
                        options={[
                          { value: 'USD', label: 'USD - Dólar Estadounidense' },
                          { value: 'EUR', label: 'EUR - Euro' },
                          { value: 'MXN', label: 'MXN - Peso Mexicano' },
                          { value: 'COP', label: 'COP - Peso Colombiano' },
                          { value: 'ARS', label: 'ARS - Peso Argentino' },
                        ]}
                        value={settings.config.currency || 'USD'}
                        onChange={(val) => handleConfigChange('currency', val)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Zona Horaria</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10" />
                        <CustomSelect
                          options={[
                            { value: 'America/New_York', label: 'New York (EST)' },
                            { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
                            { value: 'America/Bogota', label: 'Bogotá (COT)' },
                            { value: 'Europe/Madrid', label: 'Madrid (CET)' },
                            { value: 'UTC', label: 'UTC' },
                          ]}
                          value={settings.config.timezone || 'UTC'}
                          onChange={(val) => handleConfigChange('timezone', val)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Idioma por Defecto</label>
                      <div className="relative">
                        <Languages className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10" />
                        <CustomSelect
                          options={[
                            { value: 'es', label: 'Español' },
                            { value: 'en', label: 'English' },
                          ]}
                          value={settings.config.locale || 'es'}
                          onChange={(val) => handleConfigChange('locale', val)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Impuesto (%)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="number"
                          value={settings.config.taxRate || 0}
                          onChange={(e) => handleConfigChange('taxRate', parseFloat(e.target.value))}
                          className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Personalización Visual
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color del Tema</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={settings.config.themeColor || '#000000'}
                          onChange={(e) => handleConfigChange('themeColor', e.target.value)}
                          className="w-12 h-12 p-1 rounded-lg cursor-pointer bg-background border border-border"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{settings.config.themeColor || '#000000'}</p>
                          <p className="text-xs text-muted-foreground">Este color se utilizará en botones y elementos destacados.</p>
                        </div>
                      </div>
                    </div>

                    {/* Preview Section */}
                    <div className="p-6 border border-border rounded-xl bg-background/50">
                      <h3 className="text-sm font-medium mb-4">Vista Previa</h3>
                      <div className="flex gap-4">
                        <button 
                          className="h-8 px-3 rounded-md text-white text-xs font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: settings.config.themeColor || '#000000' }}
                        >
                          Botón Principal
                        </button>
                        <button 
                          className="h-8 px-3 rounded-md border text-xs font-medium transition-colors"
                          style={{ borderColor: settings.config.themeColor || '#000000', color: settings.config.themeColor || '#000000' }}
                        >
                          Botón Secundario
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Redes Sociales
                  </h2>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Facebook</label>
                      <div className="relative">
                        <Facebook className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="url"
                          value={settings.config.social?.facebook || ''}
                          onChange={(e) => handleSocialChange('facebook', e.target.value)}
                          className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Instagram</label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="url"
                          value={settings.config.social?.instagram || ''}
                          onChange={(e) => handleSocialChange('instagram', e.target.value)}
                          className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Twitter / X</label>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="url"
                          value={settings.config.social?.twitter || ''}
                          onChange={(e) => handleSocialChange('twitter', e.target.value)}
                          className="w-full pl-9 h-8 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Seguridad y Acceso
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Mostrar Portal Público</h3>
                        <p className="text-sm text-muted-foreground">Habilitar la página pública /gym/[slug] de este gimnasio</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.config.showPublicPortal || false}
                          onChange={(e) => handleConfigChange('showPublicPortal', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg gap-4">
                      <div className="space-y-1">
                        <h3 className="font-medium">Tolerancia Offline QR (min)</h3>
                        <p className="text-sm text-muted-foreground">Margen recomendado para validación cuando el miembro usa QR en modo offline</p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={settings.config.offlineToleranceMinutes ?? 5}
                        onChange={(e) =>
                          handleConfigChange(
                            'offlineToleranceMinutes',
                            Number(e.target.value) || 5,
                          )
                        }
                        className="w-24 h-8 px-2 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Autenticación de Dos Factores (MFA)</h3>
                        <p className="text-sm text-muted-foreground">Requerir MFA para todos los administradores</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.config.requireMfa || false}
                          onChange={(e) => handleConfigChange('requireMfa', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}