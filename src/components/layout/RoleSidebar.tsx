"use client";

import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import CoordinatorSidebar from "@/components/layout/CoordinatorSidebar";
import StudentSidebar from "@/components/layout/StudentSidebar";
import { useAuth } from "@/context/AuthContext";

export default function RoleSidebar({
  mode = "desktop",
  onNavigate,
}: {
  mode?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const { profile } = useAuth();

  if (profile?.role === "teacher") return <TeacherSidebar mode={mode} onNavigate={onNavigate} />;
  if (profile?.role === "coordinator") return <CoordinatorSidebar mode={mode} onNavigate={onNavigate} />;
  if (profile?.role === "student") return <StudentSidebar mode={mode} onNavigate={onNavigate} />;
  return <Sidebar mode={mode} onNavigate={onNavigate} />;
}