import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import api from './api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const savedToken = await SecureStore.getItemAsync('accessToken');
    if (savedToken) {
      setToken(savedToken);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return token ? (
    <MainApp token={token} onLogout={() => setToken(null)} />
  ) : (
    <LoginScreen onLogin={setToken} />
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      await SecureStore.setItemAsync('accessToken', access_token);
      onLogin(access_token);
    } catch (err) {
      setError('Credenciales inválidas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>GymKey</Text>
        <Text style={styles.subtitle}>Acceso Móvil</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function MainApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'plans' | 'profile'>('home');
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  const refreshData = async () => {
    try {
      const [userRes, subRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/subscriptions/my-subscription')
      ]);
      setUser(userRes.data);
      setSubscription(subRes.data);
    } catch (error) {
      console.error('Error refreshing data', error);
      // if 401, logout
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab subscription={subscription} />;
      case 'plans':
        return <PlansTab currentSubscription={subscription} onSubscribe={refreshData} />;
      case 'profile':
        return <ProfileTab user={user} subscription={subscription} onLogout={async () => {
          await SecureStore.deleteItemAsync('accessToken');
          onLogout();
        }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {renderContent()}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'home' && styles.activeTab]} 
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>🔑 Acceso</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'plans' && styles.activeTab]} 
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>💎 Planes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'profile' && styles.activeTab]} 
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function HomeTab({ subscription }: { subscription: any }) {
  const [accessKey, setAccessKey] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchKey = async () => {
    try {
      setLoading(true);
      const res = await api.get('/access-keys/my-key');
      setAccessKey(res.data.token);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscription?.status === 'ACTIVE') {
      fetchKey();
      const interval = setInterval(fetchKey, 25000);
      return () => clearInterval(interval);
    }
  }, [subscription]);

  if (!subscription || subscription.status !== 'ACTIVE') {
    return (
      <View style={styles.centered}>
        <Text style={styles.warnTitle}>Sin Acceso Activo</Text>
        <Text style={styles.warnText}>Necesitas una suscripción activa para generar tu llave de acceso.</Text>
        <Text style={styles.hint}>Ve a la pestaña "Planes" para suscribirte.</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.screenTitle}>Tu Llave de Acceso</Text>
      <View style={styles.qrContainer}>
        {loading && !accessKey ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : accessKey ? (
          <QRCode value={accessKey} size={250} />
        ) : (
          <Text>Cargando QR...</Text>
        )}
      </View>
      <Text style={styles.hint}>Este código se actualiza cada 30s</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>MEMBRESÍA ACTIVA</Text>
      </View>
    </View>
  );
}

function PlansTab({ currentSubscription, onSubscribe }: { currentSubscription: any, onSubscribe: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/plans').then(res => setPlans(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      await api.post('/subscriptions/subscribe', { planId });
      Alert.alert('¡Éxito!', 'Te has suscrito correctamente.');
      onSubscribe();
    } catch (e) {
      Alert.alert('Error', 'No se pudo procesar la suscripción.');
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator /></View>;

  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Planes Disponibles</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {plans.map(plan => (
          <View key={plan.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>${plan.price}</Text>
            </View>
            <Text style={styles.planDesc}>{plan.description || 'Acceso total al gimnasio'}</Text>
            <Text style={styles.planDuration}>{plan.durationDays} días de acceso</Text>
            
            <TouchableOpacity 
              style={[
                styles.subButton, 
                currentSubscription?.planId === plan.id && styles.disabledButton
              ]}
              disabled={currentSubscription?.planId === plan.id}
              onPress={() => handleSubscribe(plan.id)}
            >
              <Text style={styles.buttonText}>
                {currentSubscription?.planId === plan.id ? 'Plan Actual' : 'Suscribirse'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProfileTab({ user, subscription, onLogout }: { user: any, subscription: any, onLogout: () => void }) {
  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Mi Perfil</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de Suscripción</Text>
        {subscription ? (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Estado:</Text>
            <Text style={[styles.value, { color: subscription.status === 'ACTIVE' ? 'green' : 'red' }]}>
              {subscription.status}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>No tienes suscripción activa</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  mainContent: {
    flex: 1,
    paddingTop: 40, 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    padding: 5,
  },
  activeTab: {
    borderTopColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1e293b',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  hint: {
    color: '#64748b',
    marginTop: 10,
  },
  statusBadge: {
    marginTop: 30,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#166534',
    fontWeight: 'bold',
    fontSize: 12,
  },
  warnTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  warnText: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e293b',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  planDesc: {
    color: '#64748b',
    marginBottom: 5,
  },
  planDuration: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 15,
  },
  subButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userEmail: {
    color: '#64748b',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#475569',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontWeight: 'bold',
  },
  placeholderText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});
