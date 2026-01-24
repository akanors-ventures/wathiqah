import { redirect } from "@tanstack/react-router";

export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
};

export const authGuard = () => {
  if (!isAuthenticated()) {
    throw redirect({
      to: "/login",
    });
  }
};
