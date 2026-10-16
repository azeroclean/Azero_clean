export const BUSINESS = {
  name: 'Azero Clean',
  tagline: 'Seu carro sempre com outro nível',
  city: 'Atendimento com agendamento',
  phone: '88994987680',
  whatsapp: '5588994987680',
  instagram: 'https://instagram.com/azeroclean',
  address: 'R. Exemplo, 123 - Centro, Cidade - UF, 00000-000',
  mapsEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3974.123456789!2d-39.123456!3d-6.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7a0b123456789abc%3A0x123456789abcdef0!2sAzero%20Clean!5e0!3m2!1spt-BR!2sbr!4v1234567890123',
  // Horário de funcionamento por dia da semana (0 = domingo). null = fechado.
  hours: {
    0: null,
    1: ['08:00', '18:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '18:00'],
    4: ['08:00', '18:00'],
    5: ['08:00', '18:00'],
    6: ['08:00', '13:00'],
  } as Record<number, [string, string] | null>,
}

export const whatsappLink = (text?: string) =>
  `https://wa.me/${BUSINESS.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`

const toMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function isOpenDay(date: Date) {
  return BUSINESS.hours[date.getDay()] != null
}

export function getOpenStatus(now = new Date()) {
  const today = BUSINESS.hours[now.getDay()]
  if (!today) return { open: false, label: 'Fechado hoje' }

  const [start, end] = today
  const minutes = now.getHours() * 60 + now.getMinutes()
  const open = minutes >= toMinutes(start) && minutes < toMinutes(end)
  const range = `${start.replace(':00', 'h')} às ${end.replace(':00', 'h')}`

  return { open, label: open ? `Aberto agora · ${range}` : `Fechado · ${range}` }
}
