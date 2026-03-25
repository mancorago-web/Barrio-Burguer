"use client";

import { useEffect, useState } from "react";

export default function HeaderTimer() {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
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
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!currentDate || !currentTime) {
    return null;
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
