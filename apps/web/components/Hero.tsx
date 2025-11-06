"use client";

export default function Hero() {
  return (
    <div className="text-center py-16 px-4 animate-fade-in">
      {/* Logo Placeholder - Buraya logo eklenecek */}
      <div className="mb-8 flex justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl">
          🐱
        </div>
      </div>
      
      <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
        Aura Creatures
      </h1>
      
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
        Connect & Create Your
        <br />
        Digital Avatar
      </h2>
      
      <p className="text-xl text-gray-300 max-w-2xl mx-auto">
        Link your X profile, generate a unique AI creature, and mint on Base.
      </p>
    </div>
  );
}

