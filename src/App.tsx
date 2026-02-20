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
import NewTeacher from "./pages/NewTeacher";
import EditTeacher from "./pages/EditTeacher";
import Classes from "./pages/Classes";
import NewClass from "./pages/NewClass";
import EditClass from "./pages/EditClass";
import ClassDetails from "./pages/ClassDetails";
import Reports from "./pages/Reports";
import MonthlyReports from "./pages/MonthlyReports";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import ActiveProjectGate from "@/components/ActiveProjectGate";
import Login from "./pages/Login";
import AdminGate from "@/components/AdminGate";
import ProjectTheme from "@/components/ProjectTheme";
import TeacherGate from "@/components/TeacherGate";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import AdminTeachers from "@/pages/AdminTeachers";
import TeacherSelectProject from "@/pages/TeacherSelectProject";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProjectTheme />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/professor/login"
            element={<Navigate to="/login?role=teacher" replace />}
          />

          <Route
            path="/professor/*"
            element={
              <TeacherGate>
                <div className="flex min-h-screen bg-[#f8fafc]">
                  <TeacherSidebar />
                  <main className="flex-1 p-8 overflow-y-auto">
                    <Routes>
                      <Route path="selecionar-projeto" element={<TeacherSelectProject />} />
                      <Route
                        index
                        element={
                          <ActiveProjectGate>
                            <Dashboard />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos"
                        element={
                          <ActiveProjectGate>
                            <Students />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/novo"
                        element={
                          <ActiveProjectGate>
                            <NewStudent />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/editar/:id"
                        element={
                          <ActiveProjectGate>
                            <EditStudent />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas"
                        element={
                          <ActiveProjectGate>
                            <Classes />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/nova"
                        element={
                          <ActiveProjectGate>
                            <NewClass />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/editar/:id"
                        element={
                          <ActiveProjectGate>
                            <EditClass />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/:id"
                        element={
                          <ActiveProjectGate>
                            <ClassDetails />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios"
                        element={
                          <ActiveProjectGate>
                            <Reports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais"
                        element={
                          <ActiveProjectGate>
                            <MonthlyReports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais/:id"
                        element={
                          <ActiveProjectGate>
                            <MonthlyReports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </TeacherGate>
            }
          />

          <Route
            path="/*"
            element={
              <AdminGate>
                <div className="flex min-h-screen bg-[#f8fafc]">
                  <Sidebar />
                  <main className="flex-1 p-8 overflow-y-auto">
                    <Routes>
                      <Route path="/projetos" element={<Projects />} />

                      <Route path="/professores" element={<AdminTeachers />} />
                      <Route path="/professores/novo" element={<NewTeacher />} />
                      <Route path="/professores/editar/:id" element={<EditTeacher />} />

                      <Route
                        path="/"
                        element={
                          <ActiveProjectGate>
                            <Dashboard />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/alunos"
                        element={
                          <ActiveProjectGate>
                            <Students />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/alunos/novo"
                        element={
                          <ActiveProjectGate>
                            <NewStudent />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/alunos/editar/:id"
                        element={
                          <ActiveProjectGate>
                            <EditStudent />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/turmas"
                        element={
                          <ActiveProjectGate>
                            <Classes />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/turmas/nova"
                        element={
                          <ActiveProjectGate>
                            <NewClass />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/turmas/editar/:id"
                        element={
                          <ActiveProjectGate>
                            <EditClass />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/turmas/:id"
                        element={
                          <ActiveProjectGate>
                            <ClassDetails />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/relatorios"
                        element={
                          <ActiveProjectGate>
                            <Reports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/relatorios/mensais"
                        element={
                          <ActiveProjectGate>
                            <MonthlyReports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route
                        path="/relatorios/mensais/:id"
                        element={
                          <ActiveProjectGate>
                            <MonthlyReports />
                          </ActiveProjectGate>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </AdminGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;