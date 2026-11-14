// The signed-in app, and sign-in, whose next stop is the app. Landing, legal, portfolio and share pages are not.
const APP_PAGES = /^\/(?:studio|dashboard|account|login)(?:\/|$)/;

export function isAppPage(pathname: string): boolean {
  return APP_PAGES.test(pathname);
}
