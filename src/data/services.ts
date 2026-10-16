import type { VehicleType } from './vehicles'

export interface Service {
  id: string
  title: string
  description: string
  duration: string
  price: number
  priceLabel?: string
  category: string
  image: string
  benefits: string[]
  prices?: Partial<Record<VehicleType, number>>
}

export const formatPrice = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function getServicePrice(
  service: Service,
  vehicleType: VehicleType | null
): number {
  if (vehicleType) {
    const specific = service.prices?.[vehicleType]
    if (specific != null) return specific
  }
  return service.price
}

export function getServicePriceLabel(
  service: Service,
  vehicleType: VehicleType | null
): string {
  return formatPrice(getServicePrice(service, vehicleType))
}

export const services: Service[] = [
  {
    id: 'lavagem-completa',
    title: 'Lavagem Completa',
    description:
      'Ducha alta pressão, detalhamento de chassi, rodas, limpeza externa completa e acabamento.',
    duration: '50 min',
    price: 60.0,
    priceLabel: 'R$ 60,00',
    category: 'Lavagem',
    image: '/images/hero.png',
    benefits: [
      'Ducha alta pressão',
      'Detalhamento de chassi e rodas',
      'Limpeza externa completa',
      'Acabamento profissional',
    ],
  },
  {
    id: 'higienizacao-interna',
    title: 'Higienização Interna',
    description:
      'Extração a seco de estofados, dutos de A/C, painel, porta-malas e neutralização de odores.',
    duration: '2h',
    price: 150.0,
    priceLabel: 'R$ 150,00',
    category: 'Higienização',
    image: '/images/hero.png',
    benefits: [
      'Extração a seco de estofados',
      'Higienização dos dutos de A/C',
      'Limpeza de painel e revestimentos',
      'Neutralização de odores',
    ],
  },
  {
    id: 'vitrificacao',
    title: 'Proteção de Pintura / Vitrificação',
    description:
      'Descontaminação da pintura, aplicação de selante cerâmico para máximo brilho, repelência e proteção.',
    duration: '3h30',
    price: 280.0,
    priceLabel: 'R$ 280,00',
    category: 'Proteção',
    image: '/images/hero.png',
    benefits: [
      'Proteção contra raios UV',
      'Resistente a fezes de pássaros e chuva ácida',
      'Efeito hidrofóbico (repelência à água)',
      'Brilho espelhado e durabilidade superior',
    ],
  },
]
