import { describe, expect, it } from "vitest";
import { decodeHeader, htmlToText, parseMail } from "./mime";

const bytes = (text: string) => new TextEncoder().encode(text.replace(/\n/g, "\r\n"));

describe("reading a message", () => {
  it("takes the plain part of a multipart/alternative message", () => {
    const mail = parseMail(
      bytes(`From: =?UTF-8?Q?Lumen_Labs_Recruiting?= <no-reply@greenhouse.io>
To: otto+abc@track.ottosensei.com
Subject: =?UTF-8?B?VGhhbmsgeW91IGZvciBhcHBseWluZyB0byBMdW1lbiBMYWJzIOKcqA==?=
Date: Mon, 16 Nov 2026 10:12:00 +0000
Message-ID: <abc123@greenhouse.io>
X-Forwarded-For: priya@gmail.com otto+abc@track.ottosensei.com
Received: from somewhere
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="b1"

--b1
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

Hi Priya, we received your application for the Backend Engineer role. It=E2=80=99s =
in review.
--b1
Content-Type: text/html; charset="utf-8"

<p>Hi Priya</p>
--b1--
`),
    );
    expect(mail.from).toBe("Lumen Labs Recruiting <no-reply@greenhouse.io>");
    expect(mail.subject).toBe("Thank you for applying to Lumen Labs ✨");
    expect(mail.messageId).toBe("<abc123@greenhouse.io>");
    expect(mail.date).toBe("Mon, 16 Nov 2026 10:12:00 +0000");
    expect(mail.text).toBe(
      "Hi Priya, we received your application for the Backend Engineer role. It’s in review.",
    );
    expect(mail.headers).toEqual({
      "x-forwarded-for": "priya@gmail.com otto+abc@track.ottosensei.com",
    });
  });

  it("turns an HTML-only message into text and keeps its links", () => {
    const html = Buffer.from(
      `<html><head><style>p{color:red}</style></head><body><p>Thanks for applying to Quill&nbsp;&amp; co!</p><p><a href="https://jobs.ashbyhq.com/quill/123">View the job</a></p><table><tr><td>Role</td><td>Founding Engineer</td></tr></table></body></html>`,
    ).toString("base64");
    const mail = parseMail(
      bytes(`From: Quill <no-reply@ashbyhq.com>
Subject: Thanks for applying
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: base64

${html.match(/.{1,76}/g)!.join("\n")}
`),
    );
    expect(mail.text).toBe(
      "Thanks for applying to Quill & co!\n\nView the job <https://jobs.ashbyhq.com/quill/123>\n\nRole Founding Engineer",
    );
  });

  it("skips attachments, decodes Latin-1 and keeps a calendar invite's times", () => {
    const mail = parseMail(
      new Uint8Array([
        ...bytes(`From: HR <hr@saffronsystems.in>
Subject: Interview
Content-Type: multipart/mixed; boundary=outer

--outer
Content-Type: text/plain; charset=iso-8859-1
Content-Transfer-Encoding: 8bit

Caf`),
        0xe9,
        ...bytes(` interview confirmed for the QA Engineer role.
--outer
Content-Type: text/calendar; method=REQUEST

BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Interview - QA Engineer
DTSTART;TZID=Asia/Kolkata:20261126T150000
DTEND;TZID=Asia/Kolkata:20261126T160000
DESCRIPTION:secret notes
END:VEVENT
END:VCALENDAR
--outer
Content-Type: application/pdf; name=resume.pdf
Content-Disposition: attachment; filename=resume.pdf
Content-Transfer-Encoding: base64

JVBERi0xLjQK
--outer--
`),
      ]),
    );
    expect(mail.text).toBe(
      "Café interview confirmed for the QA Engineer role.\n\nCalendar event:\nSUMMARY:Interview - QA Engineer\nDTSTART;TZID=Asia/Kolkata:20261126T150000\nDTEND;TZID=Asia/Kolkata:20261126T160000",
    );
  });

  it("reads a message forwarded as an attachment like an inline forward", () => {
    const mail = parseMail(
      bytes(`From: Priya <priya@gmail.com>
Subject: Fwd: Your application
Content-Type: multipart/mixed; boundary=x

--x
Content-Type: text/plain

See below
--x
Content-Type: message/rfc822

From: Cobalt Careers <careers@cobalt.io>
Subject: Your application to Cobalt
Date: Thu, 19 Nov 2026 18:00:00 +0000

We will not be moving forward with your application.
--x--
`),
    );
    expect(mail.text).toBe(
      "See below\n\n---------- Forwarded message ---------\nFrom: Cobalt Careers <careers@cobalt.io>\nDate: Thu, 19 Nov 2026 18:00:00 +0000\nSubject: Your application to Cobalt\n\nWe will not be moving forward with your application.",
    );
  });

  it("caps the text it hands on", () => {
    const mail = parseMail(bytes(`Subject: Long\n\n${"word ".repeat(20_000)}`), 1_000);
    expect(mail.text.length).toBe(1_000);
  });

  it("decodes encoded words and joins neighbouring ones", () => {
    expect(decodeHeader("=?utf-8?q?Caf=C3=A9?= =?utf-8?q?_Noir?=")).toBe("Café Noir");
    expect(decodeHeader("Plain subject")).toBe("Plain subject");
  });

  it("drops HTML comments, scripts and entities", () => {
    expect(
      htmlToText("<!-- x --><script>alert(1)</script>Hi&#8217;s &#x2014; <b>you</b><br>next"),
    ).toBe("Hi’s — you\nnext");
  });
});
