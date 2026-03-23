import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Componentes de layout e gates — importados diretamente (usados em todas as rotas)
import Sidebar from "./components/layout/Sidebar";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import CoordinatorSidebar from "@/components/layout/CoordinatorSidebar";
import StudentSidebar from "@/components/layout/StudentSidebar";
import AppShell from "@/components/layout/AppShell";
import ProjectTheme from "@/components/ProjectTheme";
import { AuthProvider } from "@/context/AuthContext";
import AdminGate from "@/components/AdminGate";
import TeacherGate from "@/components/TeacherGate";
import CoordinatorGate from "@/components/CoordinatorGate";
import StudentGate from "@/components/StudentGate";
import ActiveProjectGate from "@/components/ActiveProjectGate";
import TeacherActiveProjectGate from "@/components/TeacherActiveProjectGate";
import CoordinatorActiveProjectGate from "@/components/CoordinatorActiveProjectGate";
import StudentActiveProjectGate from "@/components/StudentActiveProjectGate";

// Páginas — carregadas sob demanda (code splitting)
const Dashboard                   = lazy(() => import("./pages/Dashboard"));
const Students                    = lazy(() => import("./pages/Students"));
const NewStudent                  = lazy(() => import("./pages/NewStudent"));
const EditStudent                  = lazy(() => import("./pages/EditStudent"));
const NewTeacher                  = lazy(() => import("./pages/NewTeacher"));
const EditTeacher                  = lazy(() => import("./pages/EditTeacher"));
const Classes                     = lazy(() => import("./pages/Classes"));
const NewClass                    = lazy(() => import("./pages/NewClass"));
const EditClass                   = lazy(() => import("./pages/EditClass"));
const ClassDetails                = lazy(() => import("./pages/ClassDetails"));
const Reports                     = lazy(() => import("./pages/Reports"));
const MonthlyReports              = lazy(() => import("./pages/MonthlyReports"));
const NotFound                    = lazy(() => import("./pages/NotFound"));
const Projects                    = lazy(() => import("./pages/Projects"));
const Login                       = lazy(() => import("./pages/Login"));
const UnifiedLogin                = lazy(() => import("@/pages/UnifiedLogin"));
const AdminLogin                  = lazy(() => import("@/pages/AdminLogin"));
const AdminTeachers               = lazy(() => import("@/pages/AdminTeachers"));
const TeacherSelectProject        = lazy(() => import("@/pages/TeacherSelectProject"));
const TeacherAccount              = lazy(() => import("@/pages/TeacherAccount"));
const TeacherJustification        = lazy(() => import("@/pages/TeacherJustification"));
const AdminCoordinators           = lazy(() => import("@/pages/AdminCoordinators"));
const NewCoordinator              = lazy(() => import("@/pages/NewCoordinator"));
const EditCoordinator             = lazy(() => import("@/pages/EditCoordinator"));
const CoordinatorSelectProject    = lazy(() => import("@/pages/CoordinatorSelectProject"));
const CoordinatorAccount          = lazy(() => import("@/pages/CoordinatorAccount"));
const CoordinatorTeachers         = lazy(() => import("@/pages/CoordinatorTeachers"));
const CoordinatorNewTeacher       = lazy(() => import("@/pages/CoordinatorNewTeacher"));
const CoordinatorEditTeacher      = lazy(() => import("@/pages/CoordinatorEditTeacher"));
const PublicStudentRegistration   = lazy(() => import("@/pages/PublicStudentRegistration"));
const PublicTeacherRegistration   = lazy(() => import("@/pages/PublicTeacherRegistration"));
const PublicCoordinatorRegistration = lazy(() => import("@/pages/PublicCoordinatorRegistration"));
const PublicCharts                = lazy(() => import("@/pages/PublicCharts"));
const AdminRegistrationLinks      = lazy(() => import("@/pages/AdminRegistrationLinks"));
const StudentSelectProject        = lazy(() => import("@/pages/StudentSelectProject"));
const StudentDashboard            = lazy(() => import("@/pages/StudentDashboard"));
const StudentSelfEdit             = lazy(() => import("@/pages/StudentSelfEdit"));
const StudentJustification        = lazy(() => import("@/pages/StudentJustification"));
const DbStatus                    = lazy(() => import("@/pages/DbStatus"));
const TeacherLogin                = lazy(() => import("./pages/TeacherLogin"));
const StudentLogin                = lazy(() => import("./pages/StudentLogin"));
const CoordinatorLogin            = lazy(() => import("@/pages/CoordinatorLogin"));
const EnelReport                  = lazy(() => import("@/pages/EnelReport"));
const SupabaseSettings            = lazy(() => import("@/pages/SupabaseSettings"));
const AdminAccount                = lazy(() => import("@/pages/AdminAccount"));
const StudentEnrollmentLink       = lazy(() => import("@/pages/StudentEnrollmentLink"));

// Spinner simples enquanto o chunk carrega
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProjectTheme />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<UnifiedLogin />} />
              <Route path="/login/selecionar" element={<Login />} />
              <Route path="/login/admin" element={<AdminLogin />} />
              <Route path="/inscricao" element={<PublicStudentRegistration />} />
              <Route path="/inscricao-professor" element={<PublicTeacherRegistration />} />
              <Route path="/inscricao-coordenador" element={<PublicCoordinatorRegistration />} />
              <Route path="/graficos" element={<PublicCharts />} />
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
                          path="justificativas"
                          element={
                            <StudentActiveProjectGate>
                              <StudentJustification />
                            </StudentActiveProjectGate>
                          }
                        />
                        <Route
                          path="minha-ficha"
                          element={
                            <StudentActiveProjectGate>
                              <StudentSelfEdit />
                            </StudentActiveProjectGate>
                          }
                        />
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
                        <Route path="justificativas" element={<TeacherJustification />} />
                        <Route
                          path="links-inscricao"
                          element={
                            <TeacherActiveProjectGate>
                              <StudentEnrollmentLink />
                            </TeacherActiveProjectGate>
                          }
                        />
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
                        <Route
                          path="relatorios/enel"
                          element={
                            <TeacherActiveProjectGate>
                              <EnelReport />
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
                        <Route path="/supabase" element={<SupabaseSettings />} />
                        <Route path="/conta" element={<AdminAccount />} />
                        <Route path="/links-inscricao" element={<AdminRegistrationLinks />} />
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
                        <Route
                          path="relatorios/enel"
                          element={
                            <ActiveProjectGate>
                              <EnelReport />
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
                          path="links-inscricao"
                          element={
                            <CoordinatorActiveProjectGate>
                              <StudentEnrollmentLink />
                            </CoordinatorActiveProjectGate>
                          }
                        />
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
                        <Route
                          path="relatorios/enel"
                          element={
                            <CoordinatorActiveProjectGate>
                              <EnelReport />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
