"use client";

import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import { isTeacherLoggedIn } from "@/utils/teacher-auth";

export default function RoleSidebar() {
  if (isTeacherLoggedIn()) return <TeacherSidebar />;
  return <Sidebar />;
}
