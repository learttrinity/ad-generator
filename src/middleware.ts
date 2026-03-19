export { default } from "next-auth/middleware";

export const config = {
  // Protect all routes except auth pages and API auth
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
