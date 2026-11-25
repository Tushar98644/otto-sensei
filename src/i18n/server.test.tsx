import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useFormat, useLocale, useMessages } from "./client";
import { englishMessages } from "./messages";
import { getFormat, getLocale, getMessages, MessagesFor, pickMessages } from "./server";
import { setRootLang } from "./testing";

afterEach(() => setRootLang("en"));

function Skip() {
  const common = useMessages("common");
  const format = useFormat();
  return (
    <a href="#main" data-locale={useLocale()}>
      {common.skipToContent} {format.number(1000)}
    </a>
  );
}

describe("server messages", () => {
  it("reads the locale from the [lang] root param", async () => {
    expect(await getLocale()).toBe("en");
    expect(await getMessages("common")).toBe(englishMessages().common);
    expect((await getFormat()).locale).toBe("en");
  });

  it("reads English outside [lang] and for a language that isn't live", async () => {
    for (const lang of [undefined, "es", "pt-br", "xx"]) {
      setRootLang(lang);
      expect(await getLocale(), String(lang)).toBe("en");
    }
  });

  it("hands client components only the namespaces named", async () => {
    expect(Object.keys(await pickMessages("en", ["common", "site"]))).toEqual(["common", "site"]);
    const html = renderToStaticMarkup(
      await MessagesFor({ namespaces: ["common"], children: <Skip /> }),
    );
    expect(html).toBe('<a href="#main" data-locale="en">Skip to content 1,000</a>');
  });

  it("fails loudly when a client component asks for a namespace it wasn't given", async () => {
    function Missing() {
      useMessages("dashboard");
      return null;
    }
    const tree = await MessagesFor({ namespaces: ["common"], children: <Missing /> });
    expect(() => renderToStaticMarkup(tree)).toThrow(/"dashboard" messages weren't passed here/);
    expect(() => renderToStaticMarkup(<Missing />)).toThrow(/weren't passed here/);
  });
});
