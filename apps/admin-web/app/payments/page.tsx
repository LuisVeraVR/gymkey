'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  provider: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  subscription?: {
    plan: {
      name: string;
    }
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { showAlert } = useAlert();
  
  const [formData, setFormData] = useState({
    userId: '',
    planId: '',
    amount: '',
    method: 'CASH'
  });

  const fetchData = async () => {
    try {
      const [paymentsRes, usersRes, plansRes] = await Promise.all([
        api.get('/payments'),
        api.get('/users'),
        api.get('/plans')
      ]);
      setPayments(paymentsRes.data);
      setUsers(usersRes.data);
      setPlans(plansRes.data);
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setFormData({
      ...formData,
      planId,
      amount: plan ? plan.price.toString() : ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await api.post('/payments', {
        userId: formData.userId,
        planId: formData.planId,
        amount: parseFloat(formData.amount),
        method: formData.method,
        provider: 'MANUAL'
      });
      setShowModal(false);
      setFormData({ userId: '', planId: '', amount: '', method: 'CASH' });
      fetchData();
      showAlert('success', 'Pago registrado exitosamente');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al registrar pago');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Stats
  const totalRevenue = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const todayRevenue = payments
    .filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const countToday = payments
    .filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pagos y Suscripciones</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona los ingresos y planes de tus usuarios</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Registrar Pago
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase">Ingresos Totales</p>
          <p className="text-2xl font-bold text-foreground mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase">Ingresos Hoy</p>
          <p className="text-2xl font-bold text-foreground mt-1">${todayRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase">Transacciones Hoy</p>
          <p className="text-2xl font-bold text-foreground mt-1">{countToday}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{payment.user?.name || 'Desconocido'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.subscription?.plan?.name || '-'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">${Number(payment.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'COMPLETED' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(payment.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                    No hay pagos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full animate-slideInUp">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Registrar Nuevo Pago</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Usuario</label>
                <CustomSelect
                  className="bg-background"
                  options={users.map(u => ({ value: u.id, label: u.name }))}
                  value={formData.userId}
                  onChange={(val) => setFormData({...formData, userId: val})}
                  placeholder="Seleccionar usuario..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Plan</label>
                <CustomSelect
                  className="bg-background"
                  options={plans.map(p => ({ value: p.id, label: `${p.name} - $${p.price}` }))}
                  value={formData.planId}
                  onChange={(val) => handlePlanChange(val)}
                  placeholder="Seleccionar plan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Monto</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full h-8 px-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Método</label>
                  <CustomSelect
                    className="bg-background"
                    options={[
                      { value: 'CASH', label: 'Efectivo' },
                      { value: 'CARD', label: 'Tarjeta' },
                      { value: 'TRANSFER', label: 'Transferencia' },
                    ]}
                    value={formData.method}
                    onChange={(val) => setFormData({...formData, method: val})}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-xs font-medium rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
