"use client";

import { useEffect, useState } from "react";
import { getServerDate, updateServerTime } from "@/lib/serverDate";

const PERU_TIMEZONE = "America/Lima";

export default function HeaderTimer() {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const initializeServerTime = async () => {
      await updateServerTime();
      const serverDate = await getServerDate();
      const date = new Date(serverDate.timestamp);
      
      const dateFormatter = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIMEZONE,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      
      const timeFormatter = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      
      setCurrentDate(dateFormatter.format(date));
      setCurrentTime(timeFormatter.format(date));
      setSynced(true);
    };

    initializeServerTime();

    const interval = setInterval(async () => {
      const serverDate = await getServerDate();
      const date = new Date(serverDate.timestamp);
      
      const dateFormatter = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIMEZONE,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      
      const timeFormatter = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      
      setCurrentDate(dateFormatter.format(date));
      setCurrentTime(timeFormatter.format(date));
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
