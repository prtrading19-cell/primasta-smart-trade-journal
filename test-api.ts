import { GET } from "./src/app/api/us100/data/route";

// Mock Next.js request/response objects
const mockRequest = {
  url: "http://localhost/api/us100/data",
  method: "GET",
  headers: new Headers(),
  nextUrl: { searchParams: new URLSearchParams() },
} as any;

async function main() {
  try {
    const response = await GET(mockRequest);
    console.log("API responded successfully");
    const text = await response.text();
    console.log("Response length:", text.length);
    console.log("Response preview:", text.slice(0, 200));
  } catch (err) {
    console.error("API threw:", err);
  }
}

main();
