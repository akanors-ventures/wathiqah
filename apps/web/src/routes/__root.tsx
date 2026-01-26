import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import Header from "../components/layout/Header";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { ApolloClientIntegration } from "@apollo/client-integration-tanstack-start";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext extends ApolloClientIntegration.RouterContext {
  queryClient: QueryClient;
}

import { NotFound } from "@/components/errors/NotFound";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";

export const Route = createRootRouteWithContext<MyRouterContext>()({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Wathiqah",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme initialization script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              try {
                var storageKey = "vite-ui-theme";
                var defaultTheme = "dark";
                var theme = localStorage.getItem(storageKey);
                var root = document.documentElement;
                
                root.classList.remove("light", "dark");
                
                if (theme === "dark" || theme === "light") {
                  root.classList.add(theme);
                } else {
                  var isSystem = theme === "system" || (!theme && defaultTheme === "system");
                  if (isSystem) {
                    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                      root.classList.add("dark");
                    } else {
                      root.classList.add("light");
                    }
                  } else if (!theme && defaultTheme === "dark") {
                    root.classList.add("dark");
                  } else if (!theme && defaultTheme === "light") {
                    root.classList.add("light");
                  }
                }
              } catch (e) {}
            })();
          `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <AuthProvider>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Toaster />
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
            <Scripts />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
