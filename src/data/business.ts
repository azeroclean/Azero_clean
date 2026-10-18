export const BUSINESS = {
  name: 'Azero Clean',
  tagline: 'Seu carro sempre com outro nível',
  city: 'Tianguá - CE',
  phone: '88994987680',
  whatsapp: '5588994987680',
  instagram: 'https://www.instagram.com/azeroclean/',
  instagramHandle: '@azeroclean',
  logo: '/images/logo.webp',
  logoMark: '/images/logo-mark.webp',
  address: 'Rua Francisco Ananias de Vasconcelos, Tianguá - CE, 62320-000',
  // Ponto do mapa (Apple Maps: https://maps.apple/p/G-XA40d9ggHV5.z)
  coordinates: { lat: -3.71912, lng: -40.982385 },
  mapsEmbed: 'https://maps.google.com/maps?q=-3.71912,-40.982385&z=17&hl=pt-BR&output=embed',
  directions: 'https://www.google.com/maps/dir/?api=1&destination=-3.71912,-40.982385',
  appleMaps: 'https://maps.apple/p/G-XA40d9ggHV5.z',
  // Expediente padrão (0 = domingo; null = fechado). Usado até o dono salvar o dele no painel.
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

export const DEVELOPER = {
  name: 'Gustavo',
  role: 'Desenvolvedor',
  photo: '/images/gustavo-dev.jpg',
  instagram: 'https://www.instagram.com/gustt.dev/',
  instagramHandle: '@gustt.dev',
}

export const whatsappLink = (text?: string) =>
  `https://wa.me/${BUSINESS.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
