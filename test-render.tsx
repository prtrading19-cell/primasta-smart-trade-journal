import React from "react";
import { renderToString } from "react-dom/server";
import { US100ResearchDesk } from "./src/components/research/ResearchDesk";
import { ResearchAssetProvider } from "./src/context/ResearchAssetContext";

function MockWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ResearchAssetProvider>
      {children}
    </ResearchAssetProvider>
  );
}

try {
  const html = renderToString(
    <MockWrapper>
      <US100ResearchDesk />
    </MockWrapper>
  );
  console.log("Rendered successfully (first 500 chars):");
  console.log(html.slice(0, 500));
} catch (err) {
  console.error("Render failed:");
  console.error(err);
}
