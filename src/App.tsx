import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "@/components/Layout"
import {
  ProtectedRoute,
  RequireUsername,
  AdminRoute,
} from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { ResetPassword } from "@/pages/ResetPassword"
import { Welcome } from "@/pages/Welcome"
import { Matches } from "@/pages/Matches"
import { Leaderboard } from "@/pages/Leaderboard"
import { MyPredictions } from "@/pages/MyPredictions"
import { Standings } from "@/pages/Standings"
import { Admin } from "@/pages/Admin"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          {/* Need a session but not (yet) a chosen handle. */}
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route element={<RequireUsername />}>
            <Route element={<Layout />}>
              <Route index element={<Matches />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="standings" element={<Standings />} />
              <Route path="me" element={<MyPredictions />} />
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
