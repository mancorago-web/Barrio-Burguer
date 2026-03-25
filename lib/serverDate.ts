import { db } from "@/app/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

let cachedDate: string | null = null;
let cachedTimestamp: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000;

const PERU_TIMEZONE = "America/Lima";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getLocalDateTimeFromTimestamp(timestamp: number): { fecha: string; hora: string } {
  const date = new Date(timestamp);
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PERU_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const timeFormatter = new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const fecha = formatter.format(date);
  const hora = timeFormatter.format(date);
  
  return { fecha, hora };
}

export async function getServerDate(): Promise<{ fecha: string; hora: string; timestamp: number }> {
  const now = Date.now();
  
  if (cachedDate && cachedTimestamp && (now - lastFetchTime) < CACHE_DURATION) {
    return {
      fecha: cachedDate,
      hora: cachedTimestamp ? getLocalTimeString(new Date(cachedTimestamp)) : "",
      timestamp: cachedTimestamp
    };
  }

  try {
    const ref = doc(db, "_serverTime", "timestamp");
    const snap = await getDoc(ref);
    
    let serverTime: number;
    
    if (snap.exists() && snap.data().timestamp) {
      serverTime = snap.data().timestamp;
    } else {
      serverTime = now;
      await setDoc(ref, { timestamp: serverTime, updatedAt: new Date().toISOString() });
    }
    
    const { fecha, hora } = getLocalDateTimeFromTimestamp(serverTime);
    cachedDate = fecha;
    cachedTimestamp = serverTime;
    lastFetchTime = now;
    
    return { fecha, hora, timestamp: serverTime };
  } catch {
    const fallbackTime = now;
    const { fecha, hora } = getLocalDateTimeFromTimestamp(fallbackTime);
    cachedDate = fecha;
    cachedTimestamp = fallbackTime;
    lastFetchTime = now;
    
    return { fecha, hora, timestamp: fallbackTime };
  }
}

export async function getFreshServerDate(): Promise<{ fecha: string; hora: string; timestamp: number }> {
  try {
    const ref = doc(db, "_serverTime", "timestamp");
    const snap = await getDoc(ref);
    
    let serverTime: number;
    
    if (snap.exists() && snap.data().timestamp) {
      serverTime = snap.data().timestamp;
    } else {
      serverTime = Date.now();
      await setDoc(ref, { timestamp: serverTime, updatedAt: new Date().toISOString() });
    }
    
    const { fecha, hora } = getLocalDateTimeFromTimestamp(serverTime);
    
    return { fecha, hora, timestamp: serverTime };
  } catch {
    const fallbackTime = Date.now();
    const { fecha, hora } = getLocalDateTimeFromTimestamp(fallbackTime);
    return { fecha, hora, timestamp: fallbackTime };
  }
}

export async function updateServerTime(): Promise<{ timestamp: number }> {
  try {
    const ref = doc(db, "_serverTime", "timestamp");
    const now = Date.now();
    await setDoc(ref, { 
      timestamp: now, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    
    const { fecha } = getLocalDateTimeFromTimestamp(now);
    cachedDate = fecha;
    cachedTimestamp = now;
    lastFetchTime = now;
    
    return { timestamp: now };
  } catch (error) {
    console.error("Error updating server time:", error);
    return { timestamp: Date.now() };
  }
}

export function invalidateServerDate(): void {
  cachedDate = null;
  cachedTimestamp = null;
  lastFetchTime = 0;
}
