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
import TeacherActiveProjectGate from "@/components/TeacherActiveProjectGate";
import CoordinatorActiveProjectGate from "@/components/CoordinatorActiveProjectGate";
import StudentActiveProjectGate from "@/components/StudentActiveProjectGate";
import Login from "./pages/Login";
import UnifiedLogin from "@/pages/UnifiedLogin";
import AdminLogin from "@/pages/AdminLogin";
import AdminGate from "@/components/AdminGate";
import ProjectTheme from "@/components/ProjectTheme";
import TeacherGate from "@/components/TeacherGate";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import AdminTeachers from "@/pages/AdminTeachers";
import TeacherSelectProject from "@/pages/TeacherSelectProject";
import TeacherAccount from "@/pages/TeacherAccount";
import AdminCoordinators from "@/pages/AdminCoordinators";
import NewCoordinator from "@/pages/NewCoordinator";
import EditCoordinator from "@/pages/EditCoordinator";
import CoordinatorGate from "@/components/CoordinatorGate";
import CoordinatorSelectProject from "@/pages/CoordinatorSelectProject";
import CoordinatorSidebar from "@/components/layout/CoordinatorSidebar";
import CoordinatorAccount from "@/pages/CoordinatorAccount";
import CoordinatorTeachers from "@/pages/CoordinatorTeachers";
import CoordinatorNewTeacher from "@/pages/CoordinatorNewTeacher";
import CoordinatorEditTeacher from "@/pages/CoordinatorEditTeacher";
import PublicStudentRegistration from "@/pages/PublicStudentRegistration";
import StudentSelectProject from "@/pages/StudentSelectProject";
import StudentGate from "@/components/StudentGate";
import StudentSidebar from "@/components/layout/StudentSidebar";
import StudentDashboard from "@/pages/StudentDashboard";
import AppShell from "@/components/layout/AppShell";
import DbStatus from "@/pages/DbStatus";
import { AuthProvider } from "@/context/AuthContext";
import TeacherLogin from "./pages/TeacherLogin";
import StudentLogin from "./pages/StudentLogin";
import CoordinatorLogin from "@/pages/CoordinatorLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProjectTheme />
          <Routes>
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/login/selecionar" element={<Login />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/inscricao" element={<PublicStudentRegistration />} />
            <Route path="/db-status" element={<DbStatus />} />

            {/* Logins (modo B - credenciais) */}
            <Route path="/aluno/login" element={<StudentLogin />} />
            <Route path="/professor/login" element={<TeacherLogin />} />
            <Route path="/coordenador/login" element={<CoordinatorLogin />} />

            {/* Rotas do Aluno */}
            <Route
              path="/aluno/*"
              element={
                <StudentGate>
                  <AppShell
                    title="Área do aluno"
                    sidebar={({ mode, onNavigate }) => (
                      <StudentSidebar mode={mode} onNavigate={onNavigate} />
                    )}
                  >
                    <Routes>
                      <Route path="selecionar-projeto" element={<StudentSelectProject />} />
                      <Route
                        index
                        element={
                          <StudentActiveProjectGate>
                            <StudentDashboard />
                          </StudentActiveProjectGate>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppShell>
                </StudentGate>
              }
            />

            {/* Rotas do Professor */}
            <Route
              path="/professor/*"
              element={
                <TeacherGate>
                  <AppShell
                    title="Área do professor"
                    sidebar={({ mode, onNavigate }) => (
                      <TeacherSidebar mode={mode} onNavigate={onNavigate} />
                    )}
                  >
                    <Routes>
                      <Route path="selecionar-projeto" element={<TeacherSelectProject />} />
                      <Route path="conta" element={<TeacherAccount />} />
                      <Route
                        index
                        element={
                          <TeacherActiveProjectGate>
                            <Dashboard />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos"
                        element={
                          <TeacherActiveProjectGate>
                            <Students />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/novo"
                        element={
                          <TeacherActiveProjectGate>
                            <NewStudent />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/editar/:id"
                        element={
                          <TeacherActiveProjectGate>
                            <EditStudent />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas"
                        element={
                          <TeacherActiveProjectGate>
                            <Classes />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/nova"
                        element={
                          <TeacherActiveProjectGate>
                            <NewClass />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/editar/:id"
                        element={
                          <TeacherActiveProjectGate>
                            <EditClass />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/:id"
                        element={
                          <TeacherActiveProjectGate>
                            <ClassDetails />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios"
                        element={
                          <TeacherActiveProjectGate>
                            <Reports />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais"
                        element={
                          <TeacherActiveProjectGate>
                            <MonthlyReports />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais/:id"
                        element={
                          <TeacherActiveProjectGate>
                            <MonthlyReports />
                          </TeacherActiveProjectGate>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppShell>
                </TeacherGate>
              }
            />

            <Route
              path="/*"
              element={
                <AdminGate>
                  <AppShell
                    title="Admin"
                    sidebar={({ mode, onNavigate }) => (
                      <Sidebar mode={mode} onNavigate={onNavigate} />
                    )}
                  >
                    <Routes>
                      <Route path="/projetos" element={<Projects />} />

                      <Route path="/professores" element={<AdminTeachers />} />
                      <Route path="/professores/novo" element={<NewTeacher />} />
                      <Route path="/professores/editar/:id" element={<EditTeacher />} />

                      <Route path="/coordenadores" element={<AdminCoordinators />} />
                      <Route path="/coordenadores/novo" element={<NewCoordinator />} />
                      <Route path="/coordenadores/editar/:id" element={<EditCoordinator />} />

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
                  </AppShell>
                </AdminGate>
              }
            />

            {/* Rotas do Coordenador */}
            <Route
              path="/coordenador/*"
              element={
                <CoordinatorGate>
                  <AppShell
                    title="Área do coordenador"
                    sidebar={({ mode, onNavigate }) => (
                      <CoordinatorSidebar mode={mode} onNavigate={onNavigate} />
                    )}
                  >
                    <Routes>
                      <Route path="selecionar-projeto" element={<CoordinatorSelectProject />} />
                      <Route path="conta" element={<CoordinatorAccount />} />
                      <Route
                        index
                        element={
                          <CoordinatorActiveProjectGate>
                            <Dashboard />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos"
                        element={
                          <CoordinatorActiveProjectGate>
                            <Students />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/novo"
                        element={
                          <CoordinatorActiveProjectGate>
                            <NewStudent />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="alunos/editar/:id"
                        element={
                          <CoordinatorActiveProjectGate>
                            <EditStudent />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas"
                        element={
                          <CoordinatorActiveProjectGate>
                            <Classes />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/nova"
                        element={
                          <CoordinatorActiveProjectGate>
                            <NewClass />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/editar/:id"
                        element={
                          <CoordinatorActiveProjectGate>
                            <EditClass />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="turmas/:id"
                        element={
                          <CoordinatorActiveProjectGate>
                            <ClassDetails />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="professores"
                        element={
                          <CoordinatorActiveProjectGate>
                            <CoordinatorTeachers />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="professores/novo"
                        element={
                          <CoordinatorActiveProjectGate>
                            <CoordinatorNewTeacher />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="professores/editar/:id"
                        element={
                          <CoordinatorActiveProjectGate>
                            <CoordinatorEditTeacher />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios"
                        element={
                          <CoordinatorActiveProjectGate>
                            <Reports />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais"
                        element={
                          <CoordinatorActiveProjectGate>
                            <MonthlyReports />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route
                        path="relatorios/mensais/:id"
                        element={
                          <CoordinatorActiveProjectGate>
                            <MonthlyReports />
                          </CoordinatorActiveProjectGate>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppShell>
                </CoordinatorGate>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;