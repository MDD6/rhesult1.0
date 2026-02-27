import { NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyGet(request, "/api/vagas");
}

export async function POST(request: NextRequest) {
  return proxyPost(request, "/api/vagas");
}
