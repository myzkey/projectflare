import { $createCodeNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type LexicalEditor } from "lexical";
import { Bold, Code, Heading2, Italic, Link, List, ListOrdered, Quote } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const autoLinkMatchers = [
  (text: string) => {
    const match = /(https?:\/\/[^\s]+)/.exec(text);
    return match
      ? {
          index: match.index,
          length: match[0].length,
          text: match[0],
          url: match[0],
        }
      : null;
  },
];

const theme = {
  paragraph: "pf-editor-paragraph",
  quote: "pf-editor-quote",
  heading: {
    h1: "pf-editor-heading h1",
    h2: "pf-editor-heading h2",
    h3: "pf-editor-heading h3",
  },
  list: {
    ul: "pf-editor-list",
    ol: "pf-editor-list",
    listitem: "pf-editor-listitem",
  },
  text: {
    bold: "pf-editor-bold",
    italic: "pf-editor-italic",
    code: "pf-editor-inline-code",
  },
  code: "pf-editor-code",
  link: "pf-editor-link",
};

export function MarkdownEditor(props: {
  name: string;
  value?: string | null;
  placeholder: string;
  ariaLabel: string;
  compact?: boolean;
}) {
  const initialMarkdown = props.value ?? "";
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const initialConfig = useMemo(
    () => ({
      namespace: `ProjectFlareMarkdownEditor-${props.name}`,
      theme,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode, AutoLinkNode],
      onError: (error: Error) => {
        throw error;
      },
      editorState: () => $convertFromMarkdownString(initialMarkdown, TRANSFORMERS),
    }),
    [initialMarkdown, props.name],
  );

  return (
    <div className={props.compact ? "markdown-editor compact" : "markdown-editor"}>
      <input type="hidden" name={props.name} value={markdown} />
      <LexicalComposer initialConfig={initialConfig}>
        <EditorToolbar />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="markdown-editor-input"
              aria-label={props.ariaLabel}
              aria-placeholder={props.placeholder}
              placeholder={<div className="markdown-editor-placeholder">{props.placeholder}</div>}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={autoLinkMatchers} />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <OnChangePlugin
          ignoreSelectionChange={true}
          onChange={(editorState) => {
            editorState.read(() => setMarkdown($convertToMarkdownString(TRANSFORMERS)));
          }}
        />
        <FormResetPlugin markdown={initialMarkdown} onReset={setMarkdown} />
      </LexicalComposer>
    </div>
  );
}

export default MarkdownEditor;

function EditorToolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="markdown-editor-toolbar" role="toolbar" aria-label="Markdown tools">
      <ToolbarButton label="Bold" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton label="Inline code" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        <Code size={15} />
      </ToolbarButton>
      <ToolbarButton label="Heading" onClick={() => setBlock(editor, "heading")}>
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton label="Quote" onClick={() => setBlock(editor, "quote")}>
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarButton label="Code block" onClick={() => setBlock(editor, "code")}>
        <Code size={15} />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        onClick={() => {
          const url = window.prompt("URL");
          if (url !== null) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() || null);
        }}
      >
        <Link size={15} />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton(props: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function setBlock(editor: LexicalEditor, block: "heading" | "quote" | "code") {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    if (block === "heading") $setBlocksType(selection, () => $createHeadingNode("h2"));
    if (block === "quote") $setBlocksType(selection, () => $createQuoteNode());
    if (block === "code") $setBlocksType(selection, () => $createCodeNode());
  });
}

function FormResetPlugin(props: { markdown: string; onReset(markdown: string): void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const root = editor.getRootElement();
    const form = root?.closest("form");
    if (!form) return;

    const resetEditor = () => {
      window.setTimeout(() => {
        editor.update(() => {
          $getRoot().clear();
          $convertFromMarkdownString(props.markdown, TRANSFORMERS);
        });
        props.onReset(props.markdown);
      }, 0);
    };

    form.addEventListener("reset", resetEditor);
    return () => form.removeEventListener("reset", resetEditor);
  }, [editor, props]);

  return null;
}
