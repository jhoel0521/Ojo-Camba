const QUEUE_KEY = 'ojo_camba_offline_queue';

interface QueuedReporte {
  device_id: string;
  lat: number;
  lng: number;
  categoria_id: number;
  gravedad: string;
  imagen_base64: string;
  usuario_id?: number | null;
  createdAt: number;
}

export function getQueue(): QueuedReporte[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueue(reporte: Omit<QueuedReporte, 'createdAt'>) {
  const queue = getQueue();
  const compressed = {
    ...reporte,
    imagen_base64: compressImage(reporte.imagen_base64),
    createdAt: Date.now(),
  };
  queue.push(compressed);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeQueued(index: number) {
  const queue = getQueue();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flush(baseUrl: string) {
  const queue = getQueue();
  if (queue.length === 0) return;

  let success = 0;
  for (let i = queue.length - 1; i >= 0; i--) {
    try {
      const res = await fetch(`${baseUrl}/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue[i]),
      });
      if (res.ok) {
        removeQueued(i);
        success++;
      }
    } catch {
      break;
    }
  }
  return success;
}

function compressImage(base64: string): string {
  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return base64;

  const bin = atob(match[2]);
  if (bin.length < 500000) return base64;

  try {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    img.src = base64;
    canvas.width = Math.min(800, img.width || 800);
    canvas.height = Math.round((canvas.width / (img.width || 800)) * (img.height || 600));
    const ctx = canvas.getContext('2d');
    if (!ctx) return base64;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(`image/${ext}`, 0.6);
  } catch {
    return base64;
  }
}
