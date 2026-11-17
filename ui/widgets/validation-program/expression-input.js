// Generated from expression-input.jsx by scripts/build-frontend.mjs.
import React, { useEffect, useRef, useState } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { validationTextCompletions } from "./expression-language.js";
const tokenPattern = /("(?:\\.|[^"\\])*"|\$[A-Za-z_][A-Za-z0-9_]*|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?=\s*\()|[()[\]{},:·])/g;
function validationExpressionTokens(text) {
  let cursor = 0;
  const tokens = [];
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > cursor) tokens.push({ text: text.slice(cursor, match.index), type: "" });
    const token = match[0];
    tokens.push({ text: token, type: token.startsWith('"') ? "string" : token.startsWith("$") ? "variable" : /^(?:true|false|null|-?\d)/.test(token) ? "literal" : /^[A-Za-z_]/.test(token) ? "operation" : "punctuation" });
    cursor = match.index + token.length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), type: "" });
  return tokens;
}
function ValidationExpressionInput({ value = "", label = "Expression", variables = [], onChange, readOnly = false, textareaRef }) {
  const [local, setLocal] = useState(value), [caret, setCaret] = useState(0), [focused, setFocused] = useState(false), textarea = useRef(null), preview = useRef(null), frame = useRef(null);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);
  const text = onChange ? value : local, prefix = /(\$?[A-Za-z_][A-Za-z0-9_]*)$/.exec(text.slice(0, caret));
  const choices = prefix && prefix[0].length >= 2 && focused && !readOnly ? [...variables.map((name) => ({ label: `$${name}`, insert: `$${name}` })), ...validationTextCompletions].filter((item) => item.label.toLowerCase().startsWith(prefix[0].toLowerCase()) && item.label !== prefix[0]).slice(0, 8) : [];
  const change = (next) => {
    setLocal(next);
    onChange?.(next);
  };
  const complete = (item) => {
    const start = caret - prefix[0].length, next = text.slice(0, start) + item.insert + text.slice(caret), position = start + item.insert.length - (item.insert.endsWith("()") ? 1 : 0);
    change(next);
    setFocused(false);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!textarea.current) return;
      textarea.current.focus();
      textarea.current.setSelectionRange(position, position);
      setCaret(position);
    });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "schema-validation-text-input" }, /* @__PURE__ */ React.createElement("label", { className: "schema-validation-expression-label" }, label, /* @__PURE__ */ React.createElement("div", { className: "schema-validation-editor-layer" }, /* @__PURE__ */ React.createElement("pre", { className: "schema-validation-highlight", "aria-hidden": "true", ref: preview }, validationExpressionTokens(text).map((token, index) => token.type ? /* @__PURE__ */ React.createElement("span", { key: index, className: `schema-validation-token-${token.type}` }, token.text) : token.text)), /* @__PURE__ */ React.createElement("textarea", { ref: (node) => {
    textarea.current = node;
    textareaRef?.(node);
  }, className: "schema-validation-expression", "aria-label": label, rows: 2, spellCheck: false, value: text, readOnly, onChange: (event) => {
    change(event.target.value);
    setCaret(event.target.selectionStart);
  }, onSelect: (event) => setCaret(event.currentTarget.selectionStart), onFocus: () => setFocused(true), onBlur: () => setFocused(false), onScroll: (event) => {
    preview.current.scrollTop = event.currentTarget.scrollTop;
    preview.current.scrollLeft = event.currentTarget.scrollLeft;
  }, onKeyDown: (event) => {
    if (event.key === "Escape") setFocused(false);
    if (event.key === "Tab" && choices.length) {
      event.preventDefault();
      complete(choices[0]);
    }
  } }))), choices.length ? /* @__PURE__ */ React.createElement("div", { className: "schema-validation-suggestions" }, choices.map((item) => /* @__PURE__ */ React.createElement("button", { key: item.label, type: "button", className: "schema-validation-suggestion", onMouseDown: (event) => event.preventDefault(), onClick: () => complete(item) }, item.label))) : null);
}
function createValidationExpressionInput(props) {
  const wrap = document.createElement("div");
  let textarea;
  const mounted = mountReactComponent(wrap, ValidationExpressionInput, { ...props, textareaRef: (node) => {
    textarea = node;
  } });
  return { wrap, get textarea() {
    return textarea;
  }, dispose: () => mounted.dispose() };
}
export {
  ValidationExpressionInput,
  createValidationExpressionInput,
  validationExpressionTokens
};

//# sourceMappingURL=expression-input.js.map
