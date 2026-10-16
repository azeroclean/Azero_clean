import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Home } from './pages/Home'
import { BookingProvider } from './context/BookingProvider'
import './index.css'

const VehicleType = lazy(() =>
  import('./pages/VehicleType').then((module) => ({ default: module.VehicleType }))
)
const Services = lazy(() =>
  import('./pages/Services').then((module) => ({ default: module.Services }))
)
const ServiceDetail = lazy(() =>
  import('./pages/ServiceDetail').then((module) => ({ default: module.ServiceDetail }))
)
const Schedule = lazy(() =>
  import('./pages/Schedule').then((module) => ({ default: module.Schedule }))
)
const ClientInfo = lazy(() =>
  import('./pages/ClientInfo').then((module) => ({ default: module.ClientInfo }))
)
const Confirmation = lazy(() =>
  import('./pages/Confirmation').then((module) => ({ default: module.Confirmation }))
)
const Admin = lazy(() =>
  import('./pages/Admin').then((module) => ({ default: module.Admin }))
)

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/veiculo', element: <VehicleType /> },
  { path: '/servicos', element: <Services /> },
  { path: '/servico/:id', element: <ServiceDetail /> },
  { path: '/agendar', element: <Schedule /> },
  { path: '/dados', element: <ClientInfo /> },
  { path: '/confirmacao', element: <Confirmation /> },
  { path: '/admin', element: <Admin /> },
])

function App() {
  return (
    <BookingProvider>
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </BookingProvider>
  )
}

export default App
