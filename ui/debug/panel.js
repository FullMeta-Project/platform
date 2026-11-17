// Generated from panel.jsx by scripts/build-frontend.mjs.
import React from "../widgets/shared/react/react-runtime.js";
import { mountReactComponent } from "../widgets/shared/react/mount.js";
function EditorDebugPanel({ controller, onStatus = () => {
}, onWatch, register }) {
  const [info, setInfo] = React.useState({ mode: controller.serviceMode, running: false });
  const [state, setState] = React.useState(""), [commands, setCommands] = React.useState(JSON.stringify({ command: "selection.overview", args: {} }, null, 2));
  const [output, setOutput] = React.useState(""), [feedback, setFeedback] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [session, setSession] = React.useState(null), [codeRevision, setCodeRevision] = React.useState("Loading\u2026");
  const [watch, setWatch] = React.useState(() => globalThis.sessionStorage?.getItem("fullmeta.editor.watch-enabled.v1") === "true");
  React.useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void controller.inspect().then((view) => {
        if (mounted) setSession({ revision: view.revision, document: view.document?.path, dirty: view.transactions?.unsaved, webmcp: view.tools?.state });
      }).catch(() => {
      });
    };
    refresh();
    const unsubscribe = controller.subscribe((value) => {
      setInfo(value);
      if (!value.running) refresh();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [controller]);
  React.useLayoutEffect(() => register({ showResult: (value) => setOutput(JSON.stringify(value, null, 2)), status: setFeedback, revision: setCodeRevision }), [register]);
  async function run(action) {
    setBusy(true);
    try {
      const result = await action();
      if (result !== void 0) setOutput(JSON.stringify(result, null, 2));
      setFeedback("Completed in this visible browser session.");
    } catch (error) {
      setFeedback(error.message);
      onStatus(error.message);
    } finally {
      setBusy(false);
    }
  }
  const actions = [
    ["Export editor state", () => {
      const value = controller.exportState();
      const text = JSON.stringify(value, null, 2);
      setState(text);
      return { format: value.format, document: value.document?.path, characters: text.length, dialogs: value.dialogs?.length || 0 };
    }],
    ["Restore state as fixture", async () => {
      const result = await controller.importState(JSON.parse(state), { serviceMode: "fixture" });
      return { restored: true, format: result.format, serviceMode: controller.serviceMode };
    }],
    ["Dispatch normal command", () => {
      const input = JSON.parse(commands);
      return controller.dispatch(input.command, input.args || {});
    }],
    ["Run visible replay", () => controller.replay(JSON.parse(commands))],
    ["Inspect resolved UI", () => controller.inspect()],
    ["Capture checkpoint", () => controller.checkpoint("Manual checkpoint")],
    ["Use live services", () => controller.setServiceMode("live")],
    ["Use fixture services", () => controller.setServiceMode("fixture", { responses: {} })]
  ];
  return /* @__PURE__ */ React.createElement("details", { className: "editor-debug-panel", "data-editor-debug": "" }, /* @__PURE__ */ React.createElement("summary", null, "Developer state and replay \xB7 ", /* @__PURE__ */ React.createElement("strong", { role: "status", className: "editor-debug-mode", "data-service-mode": info.mode }, info.mode === "fixture" ? "Fixture services \xB7 no unregistered live operations" : "Live services")), /* @__PURE__ */ React.createElement("div", { className: "editor-debug-content" }, /* @__PURE__ */ React.createElement("p", null, "State and scenarios contain JSON data only. Fixture mode blocks every unregistered live request. Live commands retain normal validation, draft and availability checks."), /* @__PURE__ */ React.createElement("p", { "aria-label": "Editor session identity" }, "Code ", codeRevision, " \xB7 Editing revision ", session?.revision ?? 0, " \xB7 ", session?.dirty ? "Unsaved changes" : "Saved baseline", " \xB7 ", info.running ? "Developer/AI command running" : "Ready for human or AI", " \xB7 WebMCP ", session?.webmcp || "checking"), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Raw editor state JSON"), /* @__PURE__ */ React.createElement("textarea", { rows: 5, "aria-label": "Serializable editor state JSON", value: state, onChange: (event) => setState(event.target.value) })), /* @__PURE__ */ React.createElement("label", null, "Command / scenario", /* @__PURE__ */ React.createElement("textarea", { rows: 6, "aria-label": "Editor command or replay scenario JSON", value: commands, onChange: (event) => setCommands(event.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "editor-debug-actions" }, actions.map(([label, action]) => /* @__PURE__ */ React.createElement("button", { key: String(label), className: "button", type: "button", disabled: busy || info.running, onClick: () => run(action) }, String(label)))), /* @__PURE__ */ React.createElement("label", null, "Watch/reload + fixture replay ", /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": "Enable watch and fixture replay", checked: watch, onChange: (event) => {
    setWatch(event.target.checked);
    onWatch?.(event.target.checked);
  } })), /* @__PURE__ */ React.createElement("p", { role: "status" }, feedback), /* @__PURE__ */ React.createElement("pre", { "aria-label": "Editor debugging results" }, output)));
}
function mountEditorDebugPanel(container, controller, { onStatus = () => {
}, onWatch = void 0 } = {}) {
  const doc = container.ownerDocument, host = doc.createElement("div");
  host.dataset.editorDebug = "";
  container.prepend(host);
  let adapter = { showResult(_value) {
  }, status(_text) {
  }, revision(_text) {
  } };
  const register = (value) => {
    adapter = value;
  };
  const mount = mountReactComponent(host, EditorDebugPanel, { controller, onStatus, onWatch, register });
  const place = () => {
    const dialog = [...doc.querySelectorAll("dialog[open]")].at(-1);
    const target = dialog || container;
    if (host.parentElement !== target) target.prepend(host);
  };
  const observer = new MutationObserver(place);
  observer.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  place();
  return { showResult: (value) => adapter.showResult(value), status: (text) => adapter.status(text), revision: (text) => adapter.revision(text), dispose() {
    observer.disconnect();
    mount.dispose();
    host.remove();
  } };
}
export {
  EditorDebugPanel,
  mountEditorDebugPanel
};

//# sourceMappingURL=panel.js.map
