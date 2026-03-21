import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecretKey() {
  const secret = process.env.JWT_SIGNING_SECRET;
  if (!secret) {
    throw new Error("JWT_SIGNING_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("frax_company_session")?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (typeof payload.employeeId !== "string" || !payload.employeeId) {
      const url = new URL("/signin", request.url);
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    const role = typeof payload.role === "string" ? payload.role : "";
    const isApproved = payload.isApproved === true;

    // Founder routes - accept both ADMIN and FOUNDER roles
    if (path.startsWith("/founder")) {
      if (role !== "FOUNDER" && role !== "ADMIN") {
        const url = new URL("/signin", request.url);
        url.searchParams.set("redirect", path);
        return NextResponse.redirect(url);
      }
    }

    // Sales routes - accept both SALES and SALES_MEMBER roles
    if (path.startsWith("/sales")) {
      if (role !== "SALES_MEMBER" && role !== "SALES") {
        const url = new URL("/signin", request.url);
        url.searchParams.set("redirect", path);
        return NextResponse.redirect(url);
      }

      // Unapproved sales members can only see pending-approval page
      if (!isApproved && path !== "/sales/pending-approval") {
        return NextResponse.redirect(
          new URL("/sales/pending-approval", request.url)
        );
      }
    }

    return NextResponse.next();
  } catch {
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/founder/:path*", "/sales/:path*", "/dashboard/:path*"],
};
