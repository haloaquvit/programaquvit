import React from "react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Halo Dashboard!</h1>
      <p>Jika Anda melihat ini, berarti routing dan komponen dasar berfungsi. Masalah mungkin ada di komponen Dashboard yang lebih kompleks.</p>
      <p>Mohon periksa konsol browser Anda (tekan F12, lalu pilih tab Console) untuk melihat apakah ada pesan error.</p>
    </div>
  );
}