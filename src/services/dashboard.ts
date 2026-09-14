import { supabase } from '../lib/supabase'
import type { DashboardFunctionResponse, DashboardRequest, DashboardSnapshot } from '../types/dashboard'

export async function getDashboardSnapshot(params: DashboardRequest): Promise<DashboardSnapshot> {
  if (!supabase) {
    throw new Error('La configuración de Supabase no está disponible.')
  }

  const { data: response, error } = await supabase.functions.invoke<DashboardFunctionResponse>(
    'dashboard-whatsapp',
    {
      body: params,
    },
  )

  if (error) {
    throw error
  }

  if (!response || response.ok !== true || !response.data) {
    throw new Error('La función dashboard-whatsapp no devolvió una respuesta válida.')
  }

  return response.data
}
