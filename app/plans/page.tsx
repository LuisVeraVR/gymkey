'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useSocket } from '@/context/socket-context';
import { useSettings } from '@/context/settings-context';
import { Skeleton } from '@/components/ui/Skeleton';

// Interfaces
interface Plan {
  id: string;
  name: string;
  type: 'Mensual' | 'Anual' | 'Especial';
  price: number;
  description: string;
  active: boolean;
  features: string[];
}

interface Discount {
  id: string;
  name: string;
  type: 'Porcentaje' | 'Monto Fijo';
  value: number;
  code: string;
  active: boolean;
  plans: { id: string }[]; // API returns plans array
}

type PlanFormData = {
  name: string;
  type: Plan['type'];
  price: number | string;
  description: string;
  active: boolean;
  features: string[];
};

type DiscountFormData = {
  name: string;
  type: Discount['type'];
  value: number | string;
  code: string;
  active: boolean;
  applicablePlanIds: string[];
};

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'planes' | 'descuentos'>('planes');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const { currency } = useSettings();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'plan' | 'discount'>('plan');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<PlanFormData | DiscountFormData>({
    name: '',
    type: 'Mensual',
    price: 0,
    description: '',
    active: true,
    features: [''],
  });
  
  const { socket, isConnected } = useSocket();

  const isPlanFormData = (data: PlanFormData | DiscountFormData): data is PlanFormData => {
    return 'price' in data;
  };

  const isDiscountFormData = (data: PlanFormData | DiscountFormData): data is DiscountFormData => {
    return 'value' in data;
  };

  // WebSocket Event Listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Plans Events
    socket.on('plan_created', (newPlan: Plan) => {
      setPlans((prev) => [...prev, newPlan]);
    });

    socket.on('plan_updated', (updatedPlan: Plan) => {
      setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
    });

    socket.on('plan_deleted', ({ id }: { id: string }) => {
      setPlans((prev) => prev.filter((p) => p.id !== id));
    });

    // Discounts Events
    socket.on('discount_created', (newDiscount: Discount) => {
      setDiscounts((prev) => [...prev, newDiscount]);
    });

    socket.on('discount_updated', (updatedDiscount: Discount) => {
      setDiscounts((prev) => prev.map((d) => (d.id === updatedDiscount.id ? updatedDiscount : d)));
    });

    socket.on('discount_deleted', ({ id }: { id: string }) => {
      setDiscounts((prev) => prev.filter((d) => d.id !== id));
    });

    return () => {
      socket.off('plan_created');
      socket.off('plan_updated');
      socket.off('plan_deleted');
      socket.off('discount_created');
      socket.off('discount_updated');
      socket.off('discount_deleted');
    };
  }, [socket, isConnected]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, discountsRes] = await Promise.all([
        api.get('/plans'),
        api.get('/discounts')
      ]);
      setPlans(plansRes.data);
      setDiscounts(discountsRes.data);
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'plan' | 'discount', item?: Plan | Discount) => {
    setModalType(type);
    setEditingId(item ? item.id : null);
    
    if (item) {
      // Editing
      if (type === 'discount') {
          const discount = item as Discount;
          setFormData({
              name: discount.name,
              type: discount.type,
              value: discount.value,
              code: discount.code,
              active: discount.active,
              applicablePlanIds: discount.plans ? discount.plans.map((p) => p.id) : []
          });
      } else {
          const plan = item as Plan;
          setFormData({
            name: plan.name,
            type: plan.type,
            price: plan.price,
            description: plan.description,
            active: plan.active,
            features: plan.features,
          });
      }
    } else {
      // Creating
      if (type === 'plan') {
        setFormData({
          name: '',
          type: 'Mensual',
          price: 0,
          description: '',
          active: true,
          features: ['']
        });
      } else {
        setFormData({
          name: '',
          type: 'Porcentaje',
          value: 0,
          code: '',
          active: true,
          applicablePlanIds: []
        });
      }
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
        if (modalType === 'plan') {
            if (!isPlanFormData(formData)) return;
            const planData = {
                name: formData.name,
                type: formData.type,
                price: parseFloat(String(formData.price)),
                description: formData.description,
                active: formData.active,
                features: formData.features.filter((f: string) => f.trim() !== ''),
                durationDays: formData.type === 'Anual' ? 365 : 30 // Simplified logic
            };

            if (editingId) {
                await api.patch(`/plans/${editingId}`, planData);
                showAlert('success', 'Plan actualizado correctamente');
            } else {
                await api.post('/plans', planData);
                showAlert('success', 'Plan creado correctamente');
            }
        } else {
            if (!isDiscountFormData(formData)) return;
            const discountData = {
                name: formData.name,
                type: formData.type,
                value: parseFloat(String(formData.value)),
                code: formData.code,
                active: formData.active,
                applicablePlanIds: formData.applicablePlanIds
            };

            if (editingId) {
                await api.patch(`/discounts/${editingId}`, discountData);
                showAlert('success', 'Descuento actualizado correctamente');
            } else {
                await api.post('/discounts', discountData);
                showAlert('success', 'Descuento creado correctamente');
            }
        }
        setShowModal(false);
        fetchData();
    } catch (e) {
        console.error(e);
        showAlert('error', 'Error al guardar');
    }
  };

  const handleDelete = async (id: string, type: 'plan' | 'discount') => {
    if (confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
      try {
          if (type === 'plan') {
            await api.delete(`/plans/${id}`);
          } else {
            await api.delete(`/discounts/${id}`);
          }
          showAlert('success', 'Elemento eliminado');
          fetchData();
      } catch (e) {
          console.error(e);
          showAlert('error', 'Error al eliminar');
      }
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    if (!isPlanFormData(formData)) return;
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    if (!isPlanFormData(formData)) return;
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index: number) => {
    if (!isPlanFormData(formData)) return;
    const newFeatures = formData.features.filter((_, i: number) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const toggleApplicablePlan = (planId: string) => {
    if (!isDiscountFormData(formData)) return;
    const currentIds = formData.applicablePlanIds || [];
    if (currentIds.includes(planId)) {
      setFormData({ ...formData, applicablePlanIds: currentIds.filter((id: string) => id !== planId) });
    } else {
      setFormData({ ...formData, applicablePlanIds: [...currentIds, planId] });
    }
  };

  const updatePlanForm = (patch: Partial<PlanFormData>) => {
    setFormData((prev) => (isPlanFormData(prev) ? { ...prev, ...patch } : prev));
  };

  const updateDiscountForm = (patch: Partial<DiscountFormData>) => {
    setFormData((prev) => (isDiscountFormData(prev) ? { ...prev, ...patch } : prev));
  };

  const planTypeValue: Plan['type'] = isPlanFormData(formData) ? formData.type : 'Mensual';
  const planPriceValue: PlanFormData['price'] = isPlanFormData(formData) ? formData.price : 0;
  const planDescriptionValue: PlanFormData['description'] = isPlanFormData(formData) ? formData.description : '';
  const planFeaturesValue: PlanFormData['features'] = isPlanFormData(formData) ? formData.features : [];

  const discountTypeValue: Discount['type'] = isDiscountFormData(formData) ? formData.type : 'Porcentaje';
  const discountValueValue: DiscountFormData['value'] = isDiscountFormData(formData) ? formData.value : 0;
  const discountCodeValue: DiscountFormData['code'] = isDiscountFormData(formData) ? formData.code : '';
  const discountApplicablePlanIds: DiscountFormData['applicablePlanIds'] = isDiscountFormData(formData) ? formData.applicablePlanIds : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Gestión de Planes y Descuentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Administra las suscripciones, precios y promociones de tu gimnasio.</p>
        </div>
        <button 
          onClick={() => handleOpenModal(activeTab === 'planes' ? 'plan' : 'discount')}
          className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {activeTab === 'planes' ? 'Nuevo Plan' : 'Nuevo Descuento'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('planes')}
          className={`h-7 px-4 rounded-md text-xs font-medium transition-all duration-200 ${
            activeTab === 'planes'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Planes
        </button>
        <button
          onClick={() => setActiveTab('descuentos')}
          className={`h-7 px-4 rounded-md text-xs font-medium transition-all duration-200 ${
            activeTab === 'descuentos'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Descuentos
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-10 w-1/2 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Content */
        <AnimatePresence mode="wait">
          {activeTab === 'planes' ? (
            <motion.div
              key="planes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {plans.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                      No hay planes creados.
                  </div>
              )}
              {plans.map((plan) => (
                <div key={plan.id} className="group relative bg-card hover:bg-card/80 border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.type === 'Anual' ? 'bg-blue-500/10 text-blue-500' :
                      plan.type === 'Mensual' ? 'bg-green-500/10 text-green-500' :
                      'bg-purple-500/10 text-purple-500'
                    }`}>
                      {plan.type}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal('plan', plan)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(plan.id, 'plan')}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <div className="text-3xl font-bold text-primary mb-4">
                    {currency === 'COP' ? '$' : currency === 'EUR' ? '€' : '$'}
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      /{plan.type === 'Anual' ? 'año' : 'mes'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10">{plan.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-6">+{plan.features.length - 3} más...</p>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${plan.active ? 'text-green-500' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${plan.active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {plan.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="descuentos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {discounts.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                      No hay descuentos creados.
                  </div>
              )}
              {discounts.map((discount) => (
                <div key={discount.id} className="group relative bg-card hover:bg-card/80 border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      discount.type === 'Porcentaje' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {discount.type}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal('discount', discount)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(discount.id, 'discount')}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-1">{discount.name}</h3>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {discount.type === 'Porcentaje' ? `${discount.value}%` : `${currency === 'COP' ? '$' : currency === 'EUR' ? '€' : '$'}${discount.value}`}
                    <span className="text-sm font-normal text-muted-foreground ml-1">OFF</span>
                  </div>
                  <div className="bg-muted px-3 py-1 rounded-md w-fit text-xs font-mono mb-4 text-foreground/80">
                    {discount.code}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Aplica a:</p>
                    <div className="flex flex-wrap gap-2">
                      {discount.plans && discount.plans.length > 0 ? (
                        discount.plans.map(p => {
                            // Find plan name if available in current plans state, otherwise just show ID or 'Plan'
                            const planName = plans.find(plan => plan.id === p.id)?.name || 'Plan';
                            return (
                                <span key={p.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {planName}
                                </span>
                            );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Ningún plan seleccionado</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${discount.active ? 'text-green-500' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${discount.active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {discount.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-muted/30">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? 'Editar' : 'Nuevo'} {modalType === 'plan' ? 'Plan' : 'Descuento'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalType === 'plan' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nombre del Plan</label>
                    <input 
                      type="text" 
                      className="w-full h-8 px-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Plan Mensual VIP"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Tipo</label>
                      <CustomSelect
                        options={[
                          { value: 'Mensual', label: 'Mensual' },
                          { value: 'Anual', label: 'Anual' },
                          { value: 'Especial', label: 'Especial' }
                        ]}
                        value={planTypeValue}
                        onChange={(val) => updatePlanForm({ type: val as PlanFormData['type'] })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Precio</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground text-xs">
                            {currency === 'COP' ? '$' : currency === 'EUR' ? '€' : '$'}
                        </span>
                        <input 
                          type="number" 
                          className="w-full h-8 pl-7 pr-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                          value={planPriceValue}
                          onChange={(e) => updatePlanForm({ price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Descripción</label>
                    <textarea 
                      className="w-full p-2.5 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[80px] text-sm resize-none"
                      value={planDescriptionValue}
                      onChange={(e) => updatePlanForm({ description: e.target.value })}
                      placeholder="Breve descripción del plan..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Características</label>
                    {planFeaturesValue.map((feature: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 h-8 px-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                          value={feature}
                          onChange={(e) => handleFeatureChange(idx, e.target.value)}
                          placeholder="Ej. Acceso a sauna"
                        />
                        <button 
                          onClick={() => removeFeature(idx)}
                          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={addFeature}
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1 mt-1"
                    >
                      + Agregar característica
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nombre del Descuento</label>
                    <input 
                      type="text" 
                      className="w-full h-8 px-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Descuento Verano"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Tipo</label>
                      <CustomSelect
                        options={[
                          { value: 'Porcentaje', label: 'Porcentaje' },
                          { value: 'Monto Fijo', label: 'Monto Fijo' }
                        ]}
                        value={discountTypeValue}
                        onChange={(val) => updateDiscountForm({ type: val as DiscountFormData['type'] })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Valor</label>
                      <input 
                        type="number" 
                        className="w-full h-8 px-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        value={discountValueValue}
                        onChange={(e) => updateDiscountForm({ value: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Código Promocional</label>
                    <input 
                      type="text" 
                      className="w-full h-8 px-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase text-sm"
                      value={discountCodeValue}
                      onChange={(e) => updateDiscountForm({ code: e.target.value.toUpperCase() })}
                      placeholder="Ej. VERANO2026"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Aplicar a Planes</label>
                    <div className="border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-background/50">
                        {plans.length === 0 && <p className="text-sm text-muted-foreground">No hay planes disponibles</p>}
                        {plans.map(plan => (
                            <label key={plan.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={discountApplicablePlanIds.includes(plan.id)}
                                    onChange={() => toggleApplicablePlan(plan.id)}
                                />
                                <span className="text-sm text-foreground">{plan.name}</span>
                            </label>
                        ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="pt-2 flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="active"
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="active" className="text-sm font-medium text-foreground cursor-pointer">
                    Activo (Visible para usuarios)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="h-8 px-3 text-xs font-bold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 shadow-sm transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
