import type { Metadata } from 'next';

type PublicGymResponse = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    config?: Record<string, unknown> | null;
  };
  plans: Array<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    duration: number;
    features?: string[];
  }>;
  classes: Array<{
    id: string;
    name: string;
    description?: string | null;
    dayOfWeek: number[];
    startTime: string;
    duration: number;
    capacity: number;
    occupied: number;
    available: number;
    nextDate?: string | null;
    coach?: { id: string; name?: string | null };
  }>;
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
}

async function getGymData(slug: string): Promise<PublicGymResponse | null> {
  try {
    const res = await fetch(`${apiBase()}/public/gym/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicGymResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGymData(slug);
  const title = data ? `${data.tenant.name} | GymKey` : 'GymKey';
  const description = data
    ? `Conoce planes y clases de ${data.tenant.name}.`
    : 'Portal público de gimnasios en GymKey.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function PublicGymPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getGymData(slug);

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-card border border-border rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold">Gimnasio no encontrado</h1>
          <p className="text-muted-foreground mt-2">
            Verifica el enlace o intenta de nuevo más tarde.
          </p>
        </div>
      </div>
    );
  }

  const cfg = (data.tenant.config || {}) as Record<string, unknown>;
  const showPublicPortal =
    typeof cfg.showPublicPortal === 'boolean'
      ? cfg.showPublicPortal
      : Boolean(cfg.allowPublicRegistration);
  const contactPhone =
    typeof cfg.phone === 'string'
      ? cfg.phone
      : typeof cfg.contactPhone === 'string'
        ? cfg.contactPhone
        : '';
  const contactEmail =
    typeof cfg.email === 'string'
      ? cfg.email
      : typeof cfg.contactEmail === 'string'
        ? cfg.contactEmail
        : '';
  const address = typeof cfg.address === 'string' ? cfg.address : '';
  const social =
    cfg.social && typeof cfg.social === 'object'
      ? (cfg.social as Record<string, unknown>)
      : {};
  const instagram =
    typeof social.instagram === 'string'
      ? social.instagram
      : typeof cfg.instagram === 'string'
        ? cfg.instagram
        : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">GymKey</p>
            <h1 className="text-3xl font-bold mt-1">{data.tenant.name}</h1>
            <p className="text-muted-foreground mt-2">Tu entrenamiento, en un solo lugar.</p>
          </div>
          {showPublicPortal ? (
            <p className="text-sm text-muted-foreground max-w-sm text-right">
              ¿Quieres unirte? Visita {data.tenant.name}
              {address ? ` en ${address}` : ''} o contáctanos
              {contactPhone ? ` al ${contactPhone}` : ''}.
            </p>
          ) : null}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold">Planes activos</h2>
          {data.plans.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">No hay planes visibles por ahora.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {data.plans.map((plan) => (
                <div key={plan.id} className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-primary font-bold mt-1">${Number(plan.price).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.duration} dias</p>
                  <p className="text-sm text-muted-foreground mt-3">{plan.description || 'Plan estandar.'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold">Clases disponibles</h2>
          {data.classes.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">No hay clases activas por ahora.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {data.classes.map((row) => (
                <div key={row.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{row.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {row.available}/{row.capacity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {row.dayOfWeek.map((d) => DAY_LABELS[d] || d).join(', ')} · {row.startTime}
                  </p>
                  <p className="text-sm text-muted-foreground">{row.duration} min</p>
                  {row.coach?.name ? (
                    <p className="text-sm text-muted-foreground mt-1">Coach: {row.coach.name}</p>
                  ) : null}
                  {row.nextDate ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Proxima: {new Date(row.nextDate).toLocaleString('es')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold">Contacto y redes</h2>
          <div className="text-sm text-muted-foreground mt-3 space-y-1">
            {contactPhone ? <p>Telefono: {contactPhone}</p> : <p>Sin telefono configurado</p>}
            {contactEmail ? <p>Email: {contactEmail}</p> : null}
            {instagram ? (
              <p>
                Instagram:{' '}
                <a className="text-primary" href={instagram} target="_blank" rel="noreferrer">
                  {instagram}
                </a>
              </p>
            ) : (
              <p>Sin redes configuradas</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
