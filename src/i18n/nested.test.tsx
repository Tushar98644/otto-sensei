import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessagesProvider, useMessages } from "./client";
import { pickMessages } from "./server";

function Both() {
  const { title } = useMessages("portfolio");
  const { skipToContent } = useMessages("common");
  return (
    <p>
      {title} / {skipToContent}
    </p>
  );
}

describe("a provider inside another", () => {
  it("adds its namespaces to the outer ones, so a page sends only what it adds", async () => {
    const html = renderToStaticMarkup(
      <MessagesProvider locale="en" messages={await pickMessages("en", ["common"])}>
        <MessagesProvider locale="en" messages={await pickMessages("en", ["portfolio"])}>
          <Both />
        </MessagesProvider>
      </MessagesProvider>,
    );
    expect(html).toBe("<p>Portfolio / Skip to content</p>");
  });

  it("doesn't mix two languages", async () => {
    const tree = (
      <MessagesProvider locale="en" messages={await pickMessages("en", ["common"])}>
        <MessagesProvider locale="es" messages={await pickMessages("es", ["portfolio"])}>
          <Both />
        </MessagesProvider>
      </MessagesProvider>
    );
    expect(() => renderToStaticMarkup(tree)).toThrow(/"common" messages weren't passed here/);
  });
});
