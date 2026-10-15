import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Home } from './pages/Home'
import { Services } from './pages/Services'
import { ServiceDetail } from './pages/ServiceDetail'
import { Schedule } from './pages/Schedule'
import { Admin } from './pages/Admin'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/servicos',
    element: <Services />,
  },
  {
    path: '/servico/:id',
    element: <ServiceDetail />,
  },
  {
    path: '/agendar',
    element: <Schedule />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
