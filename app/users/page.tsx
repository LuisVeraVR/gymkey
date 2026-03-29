'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Tooltip } from '@/components/ui/Tooltip';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastAccess?: string;
  subscription?: {
    status: string;
    planName?: string;
    expiresAt?: string;
  };
  mustChangePassword: boolean;
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'expired';
type FilterRole = 'all' | 'MEMBER' | 'COACH' | 'STAFF' | 'GYM_ADMIN';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    ACTIVE: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
    SUSPENDED: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
    EXPIRED: 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20',
    INACTIVE: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  };

  const labels: Record<string, string> = {
    ACTIVE: t('users.active'),
    SUSPENDED: 'Suspendido',
    EXPIRED: 'Vencido',
    INACTIVE: t('users.inactive'),
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status] || styles.INACTIVE}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'ACTIVE' ? 'bg-success' : 
        status === 'SUSPENDED' ? 'bg-warning' : 
        status === 'EXPIRED' ? 'bg-destructive' : 
        'bg-muted-foreground'
      }`} />
      {labels[status] || status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    MEMBER: 'bg-primary/10 text-primary',
    COACH: 'bg-warning/10 text-warning',
    STAFF: 'bg-info/10 text-info',
    GYM_ADMIN: 'bg-chart-5/10 text-chart-5',
    SUPER_ADMIN: 'bg-destructive/10 text-destructive',
  };

  const labels: Record<string, string> = {
    MEMBER: t('users.member'),
    COACH: t('users.coach'),
    STAFF: 'Staff',
    GYM_ADMIN: t('users.admin'),
    SUPER_ADMIN: 'Super Admin',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[role] || 'bg-muted text-muted-foreground'}`}>
      {labels[role] || role}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-border last:border-0">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No hay usuarios</h3>
      <p className="text-muted-foreground text-xs max-w-sm">
        No se encontraron usuarios con los filtros seleccionados.
      </p>
    </div>
  );
}

const ADMIN_USER_ROLES = ['SUPER_ADMIN', 'GYM_ADMIN'] as const;

export default function UsersPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  
  type UserFormData = {
    name: string;
    email: string;
    password: string;
    role: string;
    isActive: boolean;
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER',
    isActive: true
  });
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
      showAlert('error', t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser) return;
    if (!ADMIN_USER_ROLES.includes(authUser.role as (typeof ADMIN_USER_ROLES)[number])) {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [authUser, router]); // eslint-disable-line react-hooks/exhaustive-deps -- fetch al obtener usuario con rol válido

  if (
    authUser &&
    !ADMIN_USER_ROLES.includes(authUser.role as (typeof ADMIN_USER_ROLES)[number])
  ) {
    return null;
  }

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', email: '', password: '', role: 'MEMBER', isActive: true });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', // Password is optional in edit
      role: user.role, 
      isActive: user.isActive 
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActionLoading('save');
    
    try {
      if (modalMode === 'create') {
        await api.post('/users', formData);
        showAlert('success', t('common.success'));
      } else {
        const updateData: Omit<UserFormData, 'password'> & { password?: string } = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {}),
        };
        await api.patch(`/users/${editingUserId}`, updateData);
        showAlert('success', t('common.success'));
      }
      
      setShowModal(false);
      fetchUsers();
    } catch (e: unknown) {
      const maybeError = e as { response?: { data?: { message?: string } } };
      const msg = maybeError.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} usuario`;
      setError(msg);
      showAlert('error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}`, { isActive: !currentStatus });
      fetchUsers();
      showAlert('success', t('common.success'));
    } catch (e) {
      console.error('Error updating user status');
      showAlert('error', t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePasswordChange = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newValue = !user.mustChangePassword;
    try {
      await api.patch(`/users/${userId}/password-change-status`, { enable: newValue });
      setUsers(users.map(u => u.id === userId ? { ...u, mustChangePassword: newValue } : u));
      showAlert('success', 'Estado de cambio de contraseña actualizado');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error updating password change status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    setActionLoading(userId);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      showAlert('success', t('common.success'));
    } catch (e: unknown) {
      const maybeError = e as { response?: { data?: { message?: string } } };
      console.error('Error deleting user');
      showAlert('error', maybeError.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && user.isActive) ||
                          (filterStatus === 'inactive' && !user.isActive) ||
                          (filterStatus === 'expired' && user.subscription?.status === 'EXPIRED');
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('users.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona los usuarios del gimnasio</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('users.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        
        <div className="w-48">
          <CustomSelect
            options={[
              { value: 'all', label: 'Estado: Todos' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
              { value: 'expired', label: 'Vencidos' },
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as FilterStatus)}
          />
        </div>

        <div className="w-48">
          <CustomSelect
            options={[
              { value: 'all', label: 'Rol: Todos' },
              { value: 'MEMBER', label: 'Miembros' },
              { value: 'COACH', label: 'Coaches' },
              { value: 'STAFF', label: 'Staff' },
              { value: 'GYM_ADMIN', label: 'Admins' },
            ]}
            value={filterRole}
            onChange={(val) => setFilterRole(val as FilterRole)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Rol</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Membresía</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      {user.subscription ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{user.subscription.planName || 'Plan'}</span>
                          <span className="text-xs text-muted-foreground">
                            Expira: {user.subscription.expiresAt ? new Date(user.subscription.expiresAt).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip content={user.mustChangePassword ? "Deshabilitar cambio de contraseña obligatorio" : "Forzar cambio de contraseña"}>
                          <button
                            onClick={() => handleTogglePasswordChange(user.id)}
                            className={`p-1.5 rounded-md transition-colors ${user.mustChangePassword ? 'text-warning bg-warning/10' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                        </Tooltip>
                        
                        <Tooltip content={user.isActive ? "Desactivar" : "Activar"}>
                          <button 
                            onClick={() => toggleStatus(user.id, user.isActive)}
                            disabled={actionLoading === user.id}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            {user.isActive ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </Tooltip>

                        <Tooltip content="Editar">
                          <button 
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Tooltip>

                        <Tooltip content="Eliminar">
                          <button 
                            onClick={() => handleDelete(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            {actionLoading === user.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border animate-slideInUp">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {modalMode === 'create' ? t('users.add') : t('common.edit')}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-8 px-3 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('auth.email')}</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-8 px-3 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="ejemplo@gymkey.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('auth.password')} {modalMode === 'edit' && <span className="text-muted-foreground font-normal">(Opcional)</span>}
                </label>
                <input 
                  type="password" 
                  required={modalMode === 'create'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full h-8 px-3 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('users.role')}</label>
                  <CustomSelect
                     options={[
                      { value: 'MEMBER', label: 'Miembro' },
                      { value: 'COACH', label: 'Coach' },
                      { value: 'STAFF', label: 'Staff' },
                      { value: 'GYM_ADMIN', label: 'Admin' },
                    ]}
                    value={formData.role}
                    onChange={(val) => setFormData({...formData, role: val})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('users.status')}</label>
                  <CustomSelect
                     options={[
                      { value: 'true', label: 'Activo' },
                      { value: 'false', label: 'Inactivo' },
                    ]}
                    value={String(formData.isActive)}
                    onChange={(val) => setFormData({...formData, isActive: val === 'true'})}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-8 text-sm font-medium text-foreground bg-secondary hover:bg-secondary-hover rounded-md transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading === 'save'}
                  className="flex-1 h-8 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'save' ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
