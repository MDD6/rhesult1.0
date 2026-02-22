import { NextRequest } from "next/server";
import { proxyRequest, proxyPost } from "@/lib/api-proxy";

export async function GET() {
  return proxyRequest({
    method: "GET",
    path: "/api/vagas",
    defaultResponse: "[]",
  });
}

export async function POST(request: NextRequest) {
  return proxyPost(request, "/api/vagas");
}
