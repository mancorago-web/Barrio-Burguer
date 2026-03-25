"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { updateServerTime } from "@/lib/serverDate";

const PERU_TIMEZONE = "America/Lima";

export default function HeaderTimer() {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [synced, setSynced] = useState(false);
  const baseTimeRef = useRef<number>(0);
  const baseDateRef = useRef<string>("");

  const syncWithServer = useCallback(async () => {
    try {
      const { timestamp } = await updateServerTime();
      baseTimeRef.current = timestamp;
      const date = new Date(timestamp);
      
      const dateFormatter = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIMEZONE,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      
      baseDateRef.current = dateFormatter.format(date);
      setCurrentDate(baseDateRef.current);
      setCurrentTime(
        date.toLocaleTimeString("es-PE", {
          timeZone: PERU_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setSynced(true);
    } catch (error) {
      console.error("Error syncing time:", error);
    }
  }, []);

  useEffect(() => {
    syncWithServer();

    const tickInterval = setInterval(() => {
      if (baseTimeRef.current > 0) {
        const now = Date.now();
        const elapsed = Math.floor((now - baseTimeRef.current) / 1000);
        const baseDate = new Date(baseTimeRef.current);
        const targetDate = new Date(baseDate.getTime() + elapsed * 1000);
        
        setCurrentTime(
          targetDate.toLocaleTimeString("es-PE", {
            timeZone: PERU_TIMEZONE,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        );
        
        const currentDay = targetDate.toLocaleDateString("es-PE", {
          timeZone: PERU_TIMEZONE,
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        
        if (currentDay !== baseDateRef.current.replace(/^[a-z]+,?\s*/i, "")) {
          baseDateRef.current = currentDay;
          setCurrentDate(currentDay);
        }
      }
    }, 1000);

    const syncInterval = setInterval(syncWithServer, 60000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, [syncWithServer]);

  if (!synced) {
    return (
      <div className="flex items-center gap-3 text-white text-sm md:text-base">
        <div className="bg-black bg-opacity-30 px-3 py-1 rounded-full">
          <span className="font-medium">Sincronizando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-white text-sm md:text-base">
      <div className="bg-black bg-opacity-30 px-3 py-1 rounded-full">
        <span className="font-medium">{currentDate}</span>
      </div>
      <div className="bg-black bg-opacity-30 px-3 py-1 rounded-full">
        <span className="font-mono font-bold">{currentTime}</span>
      </div>
    </div>
  );
}
