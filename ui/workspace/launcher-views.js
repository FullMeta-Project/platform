// Generated from launcher-views.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef } from "../widgets/shared/react/react-runtime.js";
import { mountReactComponent } from "../widgets/shared/react/mount.js";
function ApplicationCardView({ entry, onCreate, onExamples, onDelete, onControls }) {
  const card = useRef(null), edit = useRef(null), remove = useRef(null), create = useRef(null);
  useLayoutEffect(() => {
    onControls?.(entry.id, { card: card.current, edit: edit.current, delete: remove.current, create: create.current });
    return () => onControls?.(entry.id, null);
  });
  return /* @__PURE__ */ React.createElement("article", { ref: card, className: "profile-card", "data-application-id": entry.id }, /* @__PURE__ */ React.createElement("h2", null, entry.title), /* @__PURE__ */ React.createElement("p", { className: entry.error ? "launcher-status error" : void 0 }, entry.error || entry.description), entry.tags?.length ? /* @__PURE__ */ React.createElement("div", { className: "profile-meta" }, entry.tags.map((tag, index) => /* @__PURE__ */ React.createElement("span", { key: index, className: "tag" }, tag))) : null, /* @__PURE__ */ React.createElement("div", { className: "card-actions" }, entry.create?.kind === "link" ? /* @__PURE__ */ React.createElement("a", { ref: create, className: "button primary", "data-create-project": "", href: entry.create.href, title: entry.create.title }, "Create Project") : entry.create?.kind === "button" ? /* @__PURE__ */ React.createElement("button", { ref: create, className: "primary", type: "button", "data-create-project": "", onClick: (event) => onCreate?.(entry.id, event.currentTarget) }, "Create Project") : null, entry.exampleCount ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onExamples?.(entry.id) }, "Examples (", entry.exampleCount, ")") : null, /* @__PURE__ */ React.createElement("a", { ref: edit, className: "button", href: entry.editHref }, "Edit app"), /* @__PURE__ */ React.createElement("button", { ref: remove, className: "delete-project", type: "button", onClick: (event) => onDelete?.(entry.id, card.current, event.currentTarget) }, "Delete app")));
}
const ApplicationCard = React.memo(ApplicationCardView);
function LauncherApplications({ entries = [], onCreate, onExamples, onDelete, onControls }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, entries.map((entry) => /* @__PURE__ */ React.createElement(ApplicationCard, { key: entry.id, entry, onCreate, onExamples, onDelete, onControls })));
}
function ProjectCard({ entry, onOpen, onDelete, onControls }) {
  const card = useRef(null), open = useRef(null), remove = useRef(null);
  useLayoutEffect(() => {
    onControls?.(entry.id, { card: card.current, open: open.current, delete: remove.current });
    return () => onControls?.(entry.id, null);
  });
  return /* @__PURE__ */ React.createElement("article", { ref: card, className: "project-card", "data-project-id": entry.id }, /* @__PURE__ */ React.createElement("h3", null, entry.title), /* @__PURE__ */ React.createElement("div", { className: "profile-meta" }, entry.applications.map((application) => /* @__PURE__ */ React.createElement("span", { key: application.id, className: "tag" }, application.label))), /* @__PURE__ */ React.createElement("p", { className: "project-path" }, /* @__PURE__ */ React.createElement("code", null, entry.path)), /* @__PURE__ */ React.createElement("div", { className: "card-actions" }, /* @__PURE__ */ React.createElement("a", { ref: open, className: "button primary", href: entry.href, onClick: (event) => onOpen?.(entry.id, event.currentTarget, event) }, "Open project"), /* @__PURE__ */ React.createElement("button", { ref: remove, className: "delete-project", type: "button", onClick: (event) => onDelete?.(entry.id, card.current, event.currentTarget) }, "Delete project")));
}
function LauncherProjects({ entries = [], emptyMessage = "No projects yet.", onOpen, onDelete, onControls }) {
  return entries.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, entries.map((entry) => /* @__PURE__ */ React.createElement(ProjectCard, { key: entry.id, entry, onOpen, onDelete, onControls }))) : /* @__PURE__ */ React.createElement("p", { className: "empty" }, emptyMessage);
}
function ProjectModelChoices({ entries = [] }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, entries.map((entry) => /* @__PURE__ */ React.createElement("li", { key: entry.file }, /* @__PURE__ */ React.createElement("a", { className: "project-model-choice", href: entry.href }, /* @__PURE__ */ React.createElement("span", { className: "project-model-filename" }, entry.file), /* @__PURE__ */ React.createElement("span", { className: "tag" }, entry.applicationLabel)))));
}
function LauncherSelectOptions({ choices = [] }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, choices.map((choice) => /* @__PURE__ */ React.createElement("option", { key: choice.value, value: choice.value }, choice.label)));
}
const mountLauncherApplications = (container, props) => mountReactComponent(container, LauncherApplications, props);
const mountLauncherProjects = (container, props) => mountReactComponent(container, LauncherProjects, props);
const mountProjectModelChoices = (container, props) => mountReactComponent(container, ProjectModelChoices, props);
const mountLauncherSelectOptions = (container, props) => mountReactComponent(container, LauncherSelectOptions, props);
export {
  ApplicationCard,
  LauncherApplications,
  LauncherProjects,
  LauncherSelectOptions,
  ProjectCard,
  ProjectModelChoices,
  mountLauncherApplications,
  mountLauncherProjects,
  mountLauncherSelectOptions,
  mountProjectModelChoices
};

//# sourceMappingURL=launcher-views.js.map
