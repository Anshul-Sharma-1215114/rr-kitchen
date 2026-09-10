import { StaffLoginForm } from "@/components/staff-login-form";

export default function AdminLoginPage() {
  return <StaffLoginForm title="RR Kitchen — Admin Login" redirectTo="/admin" role="ADMIN" />;
}
