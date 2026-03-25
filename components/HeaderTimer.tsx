"use client";

import { useEffect, useState } from "react";
import { getServerDate, updateServerTime } from "@/lib/serverDate";

export default function HeaderTimer() {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const initializeServerTime = async () => {
      await updateServerTime();
      const serverDate = await getServerDate();
      const now = new Date(serverDate.timestamp);
      
      const dateStr = now.toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentDate(dateStr);
      setCurrentTime(timeStr);
      setSynced(true);
    };

    initializeServerTime();

    const interval = setInterval(async () => {
      const serverDate = await getServerDate();
      const now = new Date(serverDate.timestamp);
      
      const dateStr = now.toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentDate(dateStr);
      setCurrentTime(timeStr);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
