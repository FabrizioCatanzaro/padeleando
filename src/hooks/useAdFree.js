import { useAuth } from '../context/useAuth'
import { isPaidPlan, userPlan } from '../utils/plan'

export function useAdFree() {
  const { user } = useAuth()
  return isPaidPlan(userPlan(user))
}
