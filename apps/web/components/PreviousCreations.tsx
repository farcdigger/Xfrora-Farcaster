"use client";

interface Creation {
  id: number;
  image: string;
  tokenId?: number;
}

interface PreviousCreationsProps {
  creations?: Creation[];
}

export default function PreviousCreations({ creations = [] }: PreviousCreationsProps) {
  // Placeholder creations
  const placeholders = [
    { id: 1, image: "🦋", tokenId: 1 },
    { id: 2, image: "🐉", tokenId: 2 },
    { id: 3, image: "🦊", tokenId: 3 },
    { id: 4, image: "🐸", tokenId: 4 },
  ];

  const displayCreations = creations.length > 0 ? creations : placeholders;

  return (
    <div className="mt-16 animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-8">Previous Creations</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {displayCreations.map((creation) => (
          <div
            key={creation.id}
            className="card hover:scale-105 cursor-pointer transition-all duration-300"
          >
            <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center overflow-hidden">
              {/* Eğer image URL ise img tag, değilse emoji */}
              {creation.image.startsWith("http") ? (
                <img
                  src={creation.image}
                  alt={`Creation #${creation.tokenId || creation.id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">{creation.image}</span>
              )}
            </div>

            {creation.tokenId && (
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-300">Token #{creation.tokenId}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

