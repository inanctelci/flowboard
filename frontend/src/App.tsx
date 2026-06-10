import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ReactFlowProvider } from "@xyflow/react";
import { Board } from "./canvas/Board";
import { AddNodePalette } from "./canvas/AddNodePalette";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
// import { ChatSidebar } from "./components/ChatSidebar";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ReferencesPanel } from "./components/ReferencesPanel";
import { Toaster } from "./components/Toaster";
import { GenerationDialog } from "./components/GenerationDialog";
import { ResultViewer } from "./components/ResultViewer";
import { ForcedSetupGate } from "./components/ForcedSetupGate";
import { useBoardStore } from "./store/board";
import { useReferencesStore } from "./store/references";

export function App() {
  const loadInitialBoard = useBoardStore((s) => s.loadInitialBoard);
  const loadReferences = useReferencesStore((s) => s.load);
  const loading = useBoardStore((s) => s.loading);
  const boardId = useBoardStore((s) => s.boardId);
  const ran = useRef(false);

  // BUGS-03: Keep <html lang> in sync with the active locale.
  // document.documentElement is outside the React tree (#root) — direct
  // DOM mutation is correct here. i18n.resolvedLanguage is set synchronously
  // before first render (module-scope init in i18n.ts), so the initial
  // render already has the right value; the effect handles subsequent changes.
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    loadInitialBoard();
    // Fire-and-forget: panel renders the loading state inline and the
    // app stays usable even if references fail to hydrate.
    void loadReferences();
  }, [loadInitialBoard, loadReferences]);

  return (
    <div className="app">
      <ProjectSidebar />
      <ReactFlowProvider>
        <div className="canvas-wrap">
          <Toolbar />
          {loading && boardId === null ? (
            <div className="canvas-loading">Loading board…</div>
          ) : (
            <>
              <Board />
              <AddNodePalette />
            </>
          )}
          <StatusBar />
          <ReferencesPanel />
        </div>
      </ReactFlowProvider>
      {/* <ChatSidebar /> */}
      <Toaster />
      <GenerationDialog />
      <ResultViewer />
      <ForcedSetupGate />
    </div>
  );
}
