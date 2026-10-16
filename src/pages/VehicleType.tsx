import { Navigate } from 'react-router-dom'

// O tipo de veículo agora é escolhido no próprio catálogo de serviços.
// Mantemos a rota para links antigos continuarem funcionando.
export function VehicleType() {
  return <Navigate to="/servicos" replace />
}
