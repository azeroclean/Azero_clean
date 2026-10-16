import type { Service } from '../data/services'

interface ServiceImageProps {
  service: Service
  className?: string
}

export function ServiceImage({ service, className = 'h-40' }: ServiceImageProps) {
  return (
    <div className={`relative w-full overflow-hidden bg-ink ${className}`}>
      <img
        src={service.image}
        alt={service.title}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      {service.category && (
        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {service.category}
        </span>
      )}
    </div>
  )
}
