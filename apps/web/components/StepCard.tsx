"use client";

interface StepCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  status?: "idle" | "connected" | "completed";
  statusText?: string;
  actionButton?: React.ReactNode;
  children?: React.ReactNode;
}

export default function StepCard({
  icon,
  title,
  subtitle,
  status = "idle",
  statusText,
  actionButton,
  children,
}: StepCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "border-green-500/50 bg-green-500/10";
      case "completed":
        return "border-blue-500/50 bg-blue-500/10";
      default:
        return "border-white/20 bg-white/5";
    }
  };

  return (
    <div className={`card ${getStatusColor()} transition-all duration-300`}>
      {/* Icon */}
      <div className="icon-circle mx-auto mb-4">
        <span className="text-3xl">{icon}</span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-center mb-2">{title}</h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-300 text-center mb-4">{subtitle}</p>
      )}

      {/* Status */}
      {statusText && (
        <div className="mb-4">
          <div className="status-badge justify-center w-full">
            <span className="text-xs">{statusText}</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {actionButton && <div className="mt-4">{actionButton}</div>}

      {/* Children */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

