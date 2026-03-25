import { db } from "@/app/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

let cachedDate: string | null = null;
let cachedTimestamp: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000;

export async function getServerDate(): Promise<{ fecha: string; hora: string; timestamp: number }> {
  const now = Date.now();
  
  if (cachedDate && cachedTimestamp && (now - lastFetchTime) < CACHE_DURATION) {
    return {
      fecha: cachedDate,
      hora: cachedTimestamp ? new Date(cachedTimestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "",
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
    
    const serverDate = new Date(serverTime);
    cachedDate = serverDate.toISOString().split("T")[0];
    cachedTimestamp = serverTime;
    lastFetchTime = now;
    
    return {
      fecha: cachedDate,
      hora: serverDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: serverTime
    };
  } catch {
    const fallbackTime = now;
    const fallbackDate = new Date(fallbackTime);
    cachedDate = fallbackDate.toISOString().split("T")[0];
    cachedTimestamp = fallbackTime;
    lastFetchTime = now;
    
    return {
      fecha: cachedDate,
      hora: fallbackDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: cachedTimestamp
    };
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
    
    const serverDate = new Date(serverTime);
    
    return {
      fecha: serverDate.toISOString().split("T")[0],
      hora: serverDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: serverTime
    };
  } catch {
    const fallbackDate = new Date();
    return {
      fecha: fallbackDate.toISOString().split("T")[0],
      hora: fallbackDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: fallbackDate.getTime()
    };
  }
}

export async function updateServerTime(): Promise<void> {
  try {
    const ref = doc(db, "_serverTime", "timestamp");
    const now = Date.now();
    await setDoc(ref, { 
      timestamp: now, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    
    cachedDate = new Date(now).toISOString().split("T")[0];
    cachedTimestamp = now;
    lastFetchTime = now;
  } catch (error) {
    console.error("Error updating server time:", error);
  }
}

export function invalidateServerDate(): void {
  cachedDate = null;
  cachedTimestamp = null;
  lastFetchTime = 0;
}
