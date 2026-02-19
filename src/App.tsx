import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import NewStudent from "./pages/NewStudent";
import EditStudent from "./pages/EditStudent";
import Teachers from "./pages/Teachers";
import NewTeacher from "./pages/NewTeacher";
import EditTeacher from "./pages/EditTeacher";
import Classes from "./pages/Classes";
import NewClass from "./pages/NewClass";
import EditClass from "./pages/EditClass";
import ClassDetails from "./pages/ClassDetails";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import { getActiveProjectId } from "@/utils/projects";

const queryClient = new QueryClient();

const RequireProject = ({ children }: { children: React.ReactNode }) => {
  const active = getActiveProjectId();
  if (!active) return <Navigate to="/projetos" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen bg-[#f8fafc]">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto">
            <Routes>
              <Route path="/projetos" element={<Projects />} />

              <Route
                path="/"
                element={
                  <RequireProject>
                    <Dashboard />
                  </RequireProject>
                }
              />
              <Route
                path="/alunos"
                element={
                  <RequireProject>
                    <Students />
                  </RequireProject>
                }
              />
              <Route
                path="/alunos/novo"
                element={
                  <RequireProject>
                    <NewStudent />
                  </RequireProject>
                }
              />
              <Route
                path="/alunos/editar/:id"
                element={
                  <RequireProject>
                    <EditStudent />
                  </RequireProject>
                }
              />
              <Route
                path="/professores"
                element={
                  <RequireProject>
                    <Teachers />
                  </RequireProject>
                }
              />
              <Route
                path="/professores/novo"
                element={
                  <RequireProject>
                    <NewTeacher />
                  </RequireProject>
                }
              />
              <Route
                path="/professores/editar/:id"
                element={
                  <RequireProject>
                    <EditTeacher />
                  </RequireProject>
                }
              />
              <Route
                path="/turmas"
                element={
                  <RequireProject>
                    <Classes />
                  </RequireProject>
                }
              />
              <Route
                path="/turmas/nova"
                element={
                  <RequireProject>
                    <NewClass />
                  </RequireProject>
                }
              />
              <Route
                path="/turmas/editar/:id"
                element={
                  <RequireProject>
                    <EditClass />
                  </RequireProject>
                }
              />
              <Route
                path="/turmas/:id"
                element={
                  <RequireProject>
                    <ClassDetails />
                  </RequireProject>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <RequireProject>
                    <Reports />
                  </RequireProject>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;