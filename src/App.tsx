import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import NewStudent from "./pages/NewStudent";
import EditStudent from "./pages/EditStudent";
import Teachers from "./pages/Teachers";
import NewTeacher from "./pages/NewTeacher";
import EditTeacher from "./pages/EditTeacher";
import Classes from "./pages/Classes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/alunos" element={<Students />} />
              <Route path="/alunos/novo" element={<NewStudent />} />
              <Route path="/alunos/editar/:id" element={<EditStudent />} />
              <Route path="/professores" element={<Teachers />} />
              <Route path="/professores/novo" element={<NewTeacher />} />
              <Route path="/professores/editar/:id" element={<EditTeacher />} />
              <Route path="/turmas" element={<Classes />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;